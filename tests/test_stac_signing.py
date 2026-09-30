import os
import pytest
from app.services.integration import integration_service

@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv('AZURE_STORAGE_ACCOUNT', 'testaccount')
    monkeypatch.setenv('AZURE_STORAGE_KEY', 'testkey')

def test_sign_stac_url_adds_token():
    url = "https://example.blob.core.windows.net/container/blob.tif"
    signed = integration_service.sign_stac_url(url)
    assert signed.startswith(url)
    # The dummy signature adds query parameters
    assert "sv=" in signed and "sig=" in signed
