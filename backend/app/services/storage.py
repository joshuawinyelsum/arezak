"""Storage abstraction for file uploads."""
from __future__ import annotations

import logging
import uuid
import os
from fastapi import UploadFile
from pydantic_settings import BaseSettings

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # Storage remains optional for environments without upload support.
    boto3 = None
    BotoCoreError = Exception
    ClientError = Exception

logger = logging.getLogger(__name__)

class StorageConfigurationError(Exception):
    pass

class StorageService:
    def __init__(self):
        self.bucket = os.getenv("STORAGE_BUCKET") or os.getenv("AWS_S3_BUCKET") or os.getenv("S3_BUCKET")
        self.region = os.getenv("STORAGE_REGION") or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        self.access_key = os.getenv("STORAGE_ACCESS_KEY") or os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("STORAGE_SECRET_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY")
        
        self.is_configured = bool(self.bucket and self.access_key and self.secret_key and boto3)
        
        if self.is_configured:
            self.s3_client = boto3.client(
                's3',
                region_name=self.region,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key
            )
        else:
            self.s3_client = None

    def upload_profile_photo(self, user_id: uuid.UUID, file: UploadFile) -> str:
        """Upload a profile photo, validating MIME and size."""
        supported_types = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        }
        if file.content_type not in supported_types:
            raise ValueError("Only JPEG, PNG and WEBP images are supported.")

        if file.size and file.size > 5 * 1024 * 1024:
            raise ValueError("File size must be under 5MB.")
            
        header = file.file.read(512)
        file.file.seek(0)
        if not header:
            raise ValueError("Empty file provided.")

        if not self.is_configured or self.s3_client is None:
            logger.error("Storage credentials are not configured. Profile photo upload failed.")
            raise StorageConfigurationError("Profile photo storage is not configured.")
            
        file_ext = supported_types[file.content_type]
        file_name = f"profiles/{user_id}/photo_{uuid.uuid4().hex[:8]}.{file_ext}"
        
        try:
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket,
                file_name,
                ExtraArgs={
                    "ContentType": file.content_type,
                    "ACL": "public-read"
                }
            )
        except BotoCoreError as exc:
            logger.exception("Profile photo upload to object storage failed")
            raise StorageConfigurationError("Failed to upload to cloud storage.") from exc
        
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{file_name}"

    def delete_profile_photo(self, photo_url: str) -> None:
        """Remove a profile photo from storage."""
        if not photo_url or not self.is_configured:
            return
            
        try:
            # Simple extraction of key from URL
            if f"https://{self.bucket}.s3" in photo_url:
                key = photo_url.split(".amazonaws.com/")[-1]
                self.s3_client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            logger.error(f"S3 deletion failed: {e}")

storage_service = StorageService()
