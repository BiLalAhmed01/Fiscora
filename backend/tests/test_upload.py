from backend.api.routers.upload import MAX_CSV_UPLOAD_BYTES


def test_upload_csv_success(client, signed_up_user):
    _tokens, headers = signed_up_user
    csv_bytes = b"Date,Category,Amount\n2024-01-01,Food,10.00\n2024-01-02,Rent,500.00\n"
    resp = client.post(
        "/upload-csv",
        headers=headers,
        files={"file": ("small.csv", csv_bytes, "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["transactions_ingested"] == 2


def test_upload_csv_oversized_rejected(client, signed_up_user):
    _tokens, headers = signed_up_user
    oversized = b"Date,Category,Amount\n" + (b"2024-01-01,Food,10.00\n" * ((MAX_CSV_UPLOAD_BYTES // 22) + 1000))
    assert len(oversized) > MAX_CSV_UPLOAD_BYTES

    resp = client.post(
        "/upload-csv",
        headers=headers,
        files={"file": ("big.csv", oversized, "text/csv")},
    )
    assert resp.status_code == 413


def test_upload_csv_invalid_format_rejected(client, signed_up_user):
    _tokens, headers = signed_up_user
    resp = client.post(
        "/upload-csv",
        headers=headers,
        files={"file": ("bad.csv", b"not,the,right,columns\n1,2,3,4\n", "text/csv")},
    )
    assert resp.status_code == 422


def test_upload_csv_requires_auth(client):
    resp = client.post(
        "/upload-csv",
        files={"file": ("small.csv", b"Date,Category,Amount\n2024-01-01,Food,10.00\n", "text/csv")},
    )
    assert resp.status_code == 401
