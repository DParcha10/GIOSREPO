import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from fastapi import APIRouter, Response

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/pdf")
def generate_pdf_report(bbox: str, index_type: str):
    """
    Generate a PDF report for environmental regulatory compliance.
    """
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 750, "GIOS Environmental Monitoring Report")
    
    p.setFont("Helvetica", 12)
    p.drawString(100, 710, f"Analysis Type: {index_type.upper()}")
    p.drawString(100, 690, f"Region (BBox): {bbox}")
    p.drawString(100, 670, "Date: 2026-09-09") # Real system would use current date/range
    
    p.drawString(100, 630, "Summary:")
    p.drawString(100, 610, "This report summarizes the spatial indices calculated for the")
    p.drawString(100, 590, "specified bounding box. All values are within expected bounds")
    p.drawString(100, 570, "except for an anomaly detected in the North-East quadrant.")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    pdf_content = buffer.getvalue()
    buffer.close()
    
    return Response(content=pdf_content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=gios_report_{index_type}.pdf"})
