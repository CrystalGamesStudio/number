import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_creates_user_with_hashed_password(async_client: AsyncClient):
    response = await async_client.post(
        "/auth/register",
        json={"email": "test@example.com", "password": "securepassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "test@example.com"
    assert "id" in data["user"]


@pytest.mark.asyncio
async def test_register_rejects_duplicate_email(async_client: AsyncClient):
    email = "duplicate@example.com"
    await async_client.post(
        "/auth/register",
        json={"email": email, "password": "password123"}
    )
    response = await async_client.post(
        "/auth/register",
        json={"email": email, "password": "different123"}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_validates_credentials_and_returns_tokens(async_client: AsyncClient):
    email = "login-test@example.com"
    password = "mypassword123"
    await async_client.post(
        "/auth/register",
        json={"email": email, "password": password}
    )
    response = await async_client.post(
        "/auth/login",
        json={"email": email, "password": password}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == email
    assert "id" in data["user"]


@pytest.mark.asyncio
async def test_login_rejects_invalid_credentials(async_client: AsyncClient):
    email = "invalid-login@example.com"
    await async_client.post(
        "/auth/register",
        json={"email": email, "password": "correctpassword"}
    )
    response = await async_client.post(
        "/auth/login",
        json={"email": email, "password": "wrongpassword"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_invalidates_refresh_token(async_client: AsyncClient):
    email = "logout@example.com"
    register_resp = await async_client.post(
        "/auth/register",
        json={"email": email, "password": "password123"}
    )
    refresh_token = register_resp.json()["refresh_token"]

    response = await async_client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_auth_me_returns_user_from_valid_token(async_client: AsyncClient):
    email = "me@example.com"
    register_resp = await async_client.post(
        "/auth/register",
        json={"email": email, "password": "password123"}
    )
    access_token = register_resp.json()["access_token"]

    response = await async_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == email
    assert "id" in data


@pytest.mark.asyncio
async def test_auth_me_rejects_invalid_token(async_client: AsyncClient):
    response = await async_client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid_token_here"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_rejects_invalid_token(async_client: AsyncClient):
    response = await async_client.post(
        "/auth/logout",
        headers={"Authorization": "Bearer invalid_token_here"}
    )
    assert response.status_code == 401
