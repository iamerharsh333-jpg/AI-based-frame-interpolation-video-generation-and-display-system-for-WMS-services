from backend.wms import build_wms_url


def test_build_wms_url_uses_crs_for_130():
    url = build_wms_url(
        base_url="https://example.com/wms",
        layers="test:layer",
        bbox="-180,-90,180,90",
        width=256,
        height=256,
        crs="EPSG:4326",
        time="2024-01-01T00:00:00Z",
    )

    assert "REQUEST=GetMap" in url
    assert "CRS=EPSG%3A4326" in url
    assert "LAYERS=test%3Alayer" in url
    assert "TIME=2024-01-01T00%3A00%3A00Z" in url
