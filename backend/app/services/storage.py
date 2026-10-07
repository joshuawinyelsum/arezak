"""Durable object storage for user uploads.

Backed by any S3-compatible service. The deployment targets Supabase Storage,
which exposes an S3-compatible endpoint, so the same client serves Supabase,
AWS S3, Cloudflare R2 or MinIO by changing configuration only.

The user record stores the object *key*, never an absolute URL, so the bucket,
region or storage host can change without rewriting stored rows. Absolute URLs
are still accepted on read, for rows written before this change.
"""
from __future__ import annotations

import logging
import os
import uuid
from io import BytesIO
from urllib.parse import urlsplit

from fastapi import UploadFile

try:
    import boto3
    from botocore.config import Config as BotoConfig
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # Storage stays optional for environments without upload support.
    boto3 = None
    BotoConfig = None

    class BotoCoreError(Exception):  # type: ignore[no-redef]
        pass

    class ClientError(Exception):  # type: ignore[no-redef]
        pass

logger = logging.getLogger(__name__)

MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024


# The declared content type is only a hint; the bytes decide, so a renamed
# executable cannot be stored as an image.
def _is_jpeg(header: bytes) -> bool:
    return header.startswith(b"\xff\xd8\xff")


def _is_png(header: bytes) -> bool:
    return header.startswith(b"\x89PNG\r\n\x1a\n")


def _is_webp(header: bytes) -> bool:
    return len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP"


SUPPORTED_IMAGE_TYPES = {
    "image/jpeg": ("jpg", _is_jpeg),
    "image/png": ("png", _is_png),
    "image/webp": ("webp", _is_webp),
}


class StorageConfigurationError(Exception):
    """Storage is unavailable: not configured, or it rejected the call."""


class StorageService:
    def __init__(self) -> None:
        self.bucket = os.getenv("STORAGE_BUCKET") or os.getenv("AWS_S3_BUCKET") or os.getenv("S3_BUCKET")
        self.region = (
            os.getenv("STORAGE_REGION")
            or os.getenv("AWS_REGION")
            or os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        )
        self.access_key = os.getenv("STORAGE_ACCESS_KEY") or os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("STORAGE_SECRET_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")
        # Required for any non-AWS S3-compatible service (Supabase, R2, MinIO).
        self.endpoint_url = os.getenv("STORAGE_ENDPOINT_URL") or None
        self._public_base = (os.getenv("STORAGE_PUBLIC_BASE_URL") or "").rstrip("/") or None

        self.is_configured = bool(self.bucket and self.access_key and self.secret_key and boto3)

        if self.is_configured:
            self.s3_client = boto3.client(
                "s3",
                region_name=self.region,
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                config=BotoConfig(signature_version="s3v4", s3={"addressing_style": "path"}),
            )
        else:
            self.s3_client = None
            missing = [
                name
                for name, value in (
                    ("STORAGE_BUCKET", self.bucket),
                    ("STORAGE_ACCESS_KEY", self.access_key),
                    ("STORAGE_SECRET_KEY", self.secret_key),
                    ("boto3", boto3),
                )
                if not value
            ]
            logger.warning("Object storage is not configured; missing: %s", ", ".join(missing))

    # ----------------------------------------------------------------- read

    def public_url(self, reference: str | None) -> str | None:
        """Render a stored reference as a URL the browser can load."""
        if not reference:
            return None
        if reference.startswith(("http://", "https://")):
            return reference  # Row written before keys were stored.
        base = self._public_base or self._derive_public_base()
        if not base:
            return None
        return base + "/" + reference.lstrip("/")

    def _derive_public_base(self) -> str | None:
        if not self.bucket:
            return None
        if self.endpoint_url:
            host = urlsplit(self.endpoint_url).netloc
            # Supabase's S3 endpoint is <ref>.storage.supabase.co, while public
            # objects are served from <ref>.supabase.co/storage/v1/object/public.
            if host.endswith(".storage.supabase.co"):
                ref = host.split(".", 1)[0]
                return "https://" + ref + ".supabase.co/storage/v1/object/public/" + self.bucket
            return self.endpoint_url.rstrip("/") + "/" + self.bucket
        return "https://" + self.bucket + ".s3." + self.region + ".amazonaws.com"

    # ---------------------------------------------------------------- write

    def upload_profile_photo(
        self,
        user_id: uuid.UUID,
        file: UploadFile,
        previous_reference: str | None = None,
    ) -> str:
        """Validate and store a profile photo. Returns the object key."""
        declared = (file.content_type or "").split(";")[0].strip().lower()
        if declared not in SUPPORTED_IMAGE_TYPES:
            raise ValueError("Only JPEG, PNG and WEBP images are supported.")
        file_ext, matches_magic = SUPPORTED_IMAGE_TYPES[declared]

        # Read under a hard cap. `file.size` is advisory and absent for streamed
        # uploads, so it cannot be the size control.
        file.file.seek(0)
        payload = file.file.read(MAX_PROFILE_PHOTO_BYTES + 1)
        if len(payload) > MAX_PROFILE_PHOTO_BYTES:
            raise ValueError("File size must be under 5MB.")
        if not payload:
            raise ValueError("Empty file provided.")
        if not matches_magic(payload):
            raise ValueError("That file is not a valid JPEG, PNG or WEBP image.")

        if not self.is_configured or self.s3_client is None:
            logger.error("Profile photo upload rejected: object storage is not configured.")
            raise StorageConfigurationError("Profile photo storage is not configured.")

        key = "profiles/" + str(user_id) + "/photo_" + uuid.uuid4().hex + "." + file_ext
        try:
            # No ACL argument: Supabase Storage rejects ACLs and modern S3
            # buckets have them disabled. Public read is a bucket property.
            self.s3_client.upload_fileobj(
                BytesIO(payload),
                self.bucket,
                key,
                ExtraArgs={
                    "ContentType": declared,
                    "CacheControl": "public, max-age=31536000, immutable",
                },
            )
        except (BotoCoreError, ClientError) as exc:
            logger.exception("Profile photo upload to object storage failed")
            raise StorageConfigurationError("Failed to upload to object storage.") from exc

        # The replacement is durable, so the superseded object can go. Failing
        # to clean up leaves an orphan but must not fail the user's upload.
        if previous_reference:
            self.delete_profile_photo(previous_reference)

        return key

    def delete_profile_photo(self, reference: str | None) -> None:
        """Best-effort removal of a stored profile photo."""
        if not reference or not self.is_configured or self.s3_client is None:
            return
        object_key = self._to_key(reference)
        if not object_key:
            return
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=object_key)
        except (BotoCoreError, ClientError):
            logger.exception("Failed to delete profile photo object")

    def _to_key(self, reference: str) -> str | None:
        """Accept either a stored key or an absolute URL from an older row."""
        if not reference.startswith(("http://", "https://")):
            return reference.lstrip("/") or None
        path = urlsplit(reference).path.lstrip("/")
        marker = (self.bucket + "/") if self.bucket else ""
        if marker and marker in path:
            return path.split(marker, 1)[1] or None
        return path or None


storage_service = StorageService()
