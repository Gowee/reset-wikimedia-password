#!/usr/bin/env python3

from typing import Annotated, Optional
from mwclient import Site
from pydantic_settings import BaseSettings, SettingsConfigDict
from flask import Flask, abort, request, Response
from flask_cors import cross_origin


class Settings(BaseSettings):
    inbox_address: Optional[str] = None
    contact_address: Optional[str] = None
    wikimedia_site: str = "meta.wikimedia.org"
    wikimedia_username: Optional[str] = None
    wikimedia_password: Optional[str] = None
    api_token: Optional[str] = None
    allow_cors_origin: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
app = Flask(__name__)

with open("index.html", "r") as f:
    index_html = f.read()

site = Site(settings.wikimedia_site)
if settings.wikimedia_username:
    site.login(settings.wikimedia_username, settings.wikimedia_password)


def api_resetpassword(email=None, user=None):
    assert email or user
    return site.api(
        "resetpassword", email=email, user=user, token=site.get_token("csrf")
    )


@app.route("/")
def root():
    return index_html


@app.route("/get-email-addresses")
@cross_origin(origins=settings.allow_cors_origin or "null")
def get_email_address():
    callback = request.args.get("callback", None)
    if not callback or "(" in callback:
        return {"inbox": settings.inbox_address, "contact": settings.contact_address}
    else:
        return Response(f'{callback}("{settings.inbox_address}", "{settings.contact_address}")', mimetype="text/javascript")


@app.route("/reset-password")
def reset_password():
    token = request.headers.get("x-api-token", None) or request.args.get("token", None)
    if settings.api_token and token != settings.api_token:
        abort(403)

    email = request.args.get("email", None)
    if not email:
        abort(422)
    return api_resetpassword(email)
