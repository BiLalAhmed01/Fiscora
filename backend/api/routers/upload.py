from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user
from backend.api.schemas import UploadCsvResponse
from backend.db.models import Transaction, User
from backend.db.session import get_db
from backend.tools.csv_parser import parse_csv_transactions, validate_csv_format

router = APIRouter(tags=["upload"])

MAX_CSV_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB
_READ_CHUNK_BYTES = 1024 * 1024


@router.post("/upload-csv", response_model=UploadCsvResponse)
async def upload_csv(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chunks: list[bytes] = []
    total_bytes = 0
    while True:
        chunk = await file.read(_READ_CHUNK_BYTES)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_CSV_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"CSV file exceeds the {MAX_CSV_UPLOAD_BYTES // (1024 * 1024)}MB upload limit",
            )
        chunks.append(chunk)
    content = b"".join(chunks)

    is_valid, message = validate_csv_format(content)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)

    parsed = parse_csv_transactions(content)

    for row in parsed["transactions"]:
        db.add(
            Transaction(
                user_id=user.id,
                date=row["Date"],
                category=row["Category"],
                amount=row["Amount"],
                source="csv_upload",
            )
        )
    db.commit()

    return UploadCsvResponse(
        transactions_ingested=len(parsed["transactions"]),
        category_totals=parsed["category_totals"],
    )
