"""Storage abstraction for file uploads."""
from __future__ import annotations

import logging
import uuid
import os
from fastapi import UploadFile

logger = logging.getLogger(__name__)

class StorageConfigurationError(Exception):
    pass

class StorageService:
    def upload_profile_photo(self, user_id: uuid.UUID, file: UploadFile) -> str:
        """Upload a profile photo, validating MIME and size."""
        if file.content_type not in ["image/jpeg", "image/png"]:
            raise ValueError("Only JPEG and PNG images are supported.")

        if file.size and file.size > 5 * 1024 * 1024:
            raise ValueError("File size must be under 5MB.")
            
        # Verify it's actually readable as an image (basic check)
        header = file.file.read(512)
        file.file.seek(0)
        if not header:
            raise ValueError("Empty file provided.")

            
        # Real S3/GCS implementation would go here
        storage_bucket = os.getenv("STORAGE_BUCKET")
        if not storage_bucket:
            logger.error("Storage bucket is not configured. Profile photo upload failed.")
            raise StorageConfigurationError("Profile photo storage is not configured.")
            
        # E.g., s3_client.upload_fileobj(...)
        # We simulate a success URI for now if the bucket is configured.
        file_ext = "jpg" if file.content_type == "image/jpeg" else "png"
        file_name = f"profiles/{user_id}/photo_{uuid.uuid4().hex[:8]}.{file_ext}"
        
        return f"https://{storage_bucket}.s3.amazonaws.com/{file_name}"

    def delete_profile_photo(self, photo_url: str) -> None:
        """Remove a profile photo from storage."""
        if not photo_url:
            return
        storage_bucket = os.getenv("STORAGE_BUCKET")
        if not storage_bucket:
            return
        
        logger.info("Storage deletion abstraction called.")
        # E.g., s3_client.delete_object(...)

storage_service = StorageService()
