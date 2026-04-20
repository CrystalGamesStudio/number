import uuid
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _register_and_get_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/auth/register",
        json={"email": "files@example.com", "password": "password123"},
    )
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_upload_rejects_unauthenticated_request(async_client: AsyncClient):
    response = await async_client.post("/files/upload")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_rejects_file_exceeding_10mb(async_client: AsyncClient):
    token = await _register_and_get_token(async_client)
    large_content = b"x" * (10 * 1024 * 1024 + 1)
    response = await async_client.post(
        "/files/upload",
        headers=_auth_header(token),
        files={"file": ("big.jpg", large_content, "image/jpeg")},
    )
    assert response.status_code == 413


@pytest.mark.asyncio
async def test_upload_rejects_disallowed_content_type(async_client: AsyncClient):
    token = await _register_and_get_token(async_client)
    response = await async_client.post(
        "/files/upload",
        headers=_auth_header(token),
        files={"file": ("malware.exe", b"binary content", "application/x-msdownload")},
    )
    assert response.status_code == 415


@pytest.mark.asyncio
async def test_upload_accepts_valid_file_and_returns_metadata(async_client: AsyncClient):
    token = await _register_and_get_token(async_client)
    fake_content = b"fake image data"

    with patch("app.files.get_s3_client") as mock_s3:
        mock_client = MagicMock()
        mock_client.generate_presigned_url.return_value = "https://r2.example.com/file"
        mock_s3.return_value = mock_client

        response = await async_client.post(
            "/files/upload",
            headers=_auth_header(token),
            files={"file": ("photo.jpg", fake_content, "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["original_filename"] == "photo.jpg"
    assert data["content_type"] == "image/jpeg"
    assert data["size"] == len(fake_content)
    assert "url" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_presigned_url_returns_secure_url_for_file(async_client: AsyncClient):
    token = await _register_and_get_token(async_client)

    with patch("app.files.get_s3_client") as mock_s3:
        mock_client = MagicMock()
        mock_client.upload_fileobj.return_value = None
        mock_client.generate_presigned_url.return_value = "https://r2.example.com/file"
        mock_s3.return_value = mock_client

        upload_resp = await async_client.post(
            "/files/upload",
            headers=_auth_header(token),
            files={"file": ("photo.jpg", b"img", "image/jpeg")},
        )
        file_id = upload_resp.json()["id"]

        mock_client.generate_presigned_url.return_value = "https://r2.example.com/presigned-file?token=abc"
        presigned_resp = await async_client.get(
            f"/files/{file_id}/url",
            headers=_auth_header(token),
        )

    assert presigned_resp.status_code == 200
    assert "url" in presigned_resp.json()
    assert "presigned" in presigned_resp.json()["url"]


@pytest.mark.asyncio
async def test_presigned_url_rejects_unauthenticated_request(async_client: AsyncClient):
    response = await async_client.get("/files/1/url")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_stores_file_with_uuid_name(async_client: AsyncClient):
    token = await _register_and_get_token(async_client)

    with patch("app.files.get_s3_client") as mock_s3:
        mock_client = MagicMock()
        mock_client.generate_presigned_url.return_value = "https://r2.example.com/file"
        mock_s3.return_value = mock_client

        response = await async_client.post(
            "/files/upload",
            headers=_auth_header(token),
            files={"file": ("photo.jpg", b"img", "image/jpeg")},
        )

    data = response.json()
    stored_name = data["filename"]
    assert stored_name != "photo.jpg"
    assert stored_name.endswith(".jpg")
    name_without_ext = stored_name.rsplit(".", 1)[0]
    uuid.UUID(name_without_ext)  # raises ValueError if not a valid UUID
