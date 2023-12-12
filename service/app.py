#!/usr/bin/env python3

from typing import Annotated, Optional
from fastapi import FastAPI, Header, Depends, HTTPException
from fastapi.responses import HTMLResponse
from mwclient import Site
from asyncer import asyncify
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    inbox_address: Optional[str] = None
    contact_address: Optional[str] = None
    wikimedia_site: str = "meta.wikimedia.org"
    wikimedia_username: Optional[str] = None
    wikimedia_password: Optional[str] = None
    api_token: Optional[str] = None

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')


settings = Settings()
app = FastAPI()

with open("index.html", "r") as f:
    index_html = f.read()

site = Site(settings.wikimedia_site)
if settings.wikimedia_username:
    site.login(settings.wikimedia_username, settings.wikimedia_password)

@asyncify
def api_resetpassword(email=None, user=None):
    assert email or user
    return site.api("resetpassword", email=email, user=user, token=site.get_token('csrf'))

async def protected(x_api_token: Annotated[str| None, Header()] = None):
    if settings.api_token and x_api_token != settings.api_token:
        raise HTTPException(status_code=403, detail="Invalid token")


@app.get("/", response_class=HTMLResponse)
def root():
    return index_html

@app.get("/get-email-addresses")
def get_email_address():
    return {'inbox': settings.inbox_address, 'contact': settings.contact_address}

@app.get("/reset-password")
async def reset_password(email: str, _: Annotated[None, Depends(protected)]):
    return await api_resetpassword(email)

app = app
