#!/usr/bin/env python3
import sys
import os

def create_endpoint(name: str):
    """
    自動生成 FastAPI 的 Endpoint, Service, 和 Schema 模板
    """
    # 1. Schema
    schema_content = f"""from pydantic import BaseModel

class {name.capitalize()}Base(BaseModel):
    pass

class {name.capitalize()}Create({name.capitalize()}Base):
    pass

class {name.capitalize()}({name.capitalize()}Base):
    id: str
    class Config:
        from_attributes = True
"""
    with open(f"server/app/schemas/{name}.py", "w") as f:
        f.write(schema_content)

    # 2. Service
    service_content = f"""from app.schemas.{name} import {name.capitalize()}Create

class {name.capitalize()}Service:
    @staticmethod
    async def create_item(obj_in: {name.capitalize()}Create):
        # 實作邏輯
        return {{"status": "created"}}
"""
    with open(f"server/app/services/{name}_service.py", "w") as f:
        f.write(service_content)

    # 3. Endpoint
    endpoint_content = f"""from fastapi import APIRouter
from app.schemas.{name} import {name.capitalize()}
from app.services.{name}_service import {name.capitalize()}Service

router = APIRouter()

@router.post("/", response_model=dict)
async def create_{name}(item_in: dict):
    return await {name.capitalize()}Service.create_item(item_in)
"""
    with open(f"server/app/api/v1/endpoints/{name}.py", "w") as f:
        f.write(endpoint_content)

    print(f"Successfully created endpoint, service and schema for: {name}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        create_endpoint(sys.argv[1])
    else:
        print("Usage: python3 create_api_endpoint.py <name>")
