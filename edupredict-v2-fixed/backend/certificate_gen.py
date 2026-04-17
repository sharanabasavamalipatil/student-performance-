"""
certificate_gen.py — Course Completion Certificate Generator
Generates professional PDF certificates for EduPredict course completions.
"""
import io, datetime, uuid
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER


def _draw_border(c, width, height):
    """Draw an elegant double border."""
    margin = 20
    c.setStrokeColor(colors.HexColor("#4f46e5"))
    c.setLineWidth(3)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin)
    c.setStrokeColor(colors.HexColor("#a5b4fc"))
    c.setLineWidth(1)
    inner = margin + 8
    c.rect(inner, inner, width - 2 * inner, height - 2 * inner)


def _draw_decorative_elements(c, width, height):
    """Draw corner ornaments and decorative lines."""
    # Corner circles
    corners = [(40, 40), (width - 40, 40), (40, height - 40), (width - 40, height - 40)]
    c.setFillColor(colors.HexColor("#4f46e5"))
    for x, y in corners:
        c.circle(x, y, 8, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#c7d2fe"))
        c.circle(x, y, 4, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#4f46e5"))

    # Decorative horizontal lines
    c.setStrokeColor(colors.HexColor("#6366f1"))
    c.setLineWidth(0.5)
    for y_pos in [height * 0.72, height * 0.28]:
        c.line(60, y_pos, width - 60, y_pos)


def _add_gradient_header(c, width, height):
    """Add header background with gradient-like effect."""
    # Top band
    c.setFillColor(colors.HexColor("#1e1b4b"))
    c.rect(30, height - 100, width - 60, 70, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#312e81"))
    c.rect(30, height - 110, width - 60, 15, fill=1, stroke=0)


def generate_certificate(
    student_name: str,
    course_name: str,
    course_id: str,
    completion_date: str,
    student_id: str,
    certificate_id: str,
    instructor_name: str = "EduPredict Faculty",
    cgpa: float = None,
    branch: str = "",
) -> bytes:
    """
    Generate a professional course completion certificate as PDF bytes.
    """
    buf = io.BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # Background
    c.setFillColor(colors.HexColor("#f8f7ff"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Header background
    _add_gradient_header(c, width, height)
    _draw_border(c, width, height)
    _draw_decorative_elements(c, width, height)

    # ── Header text ──────────────────────────────────────────
    c.setFillColor(colors.HexColor("#c7d2fe"))
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, height - 58, "🎓  E D U P R E D I C T  A I  P L A T F O R M")

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 82, "Certificate of Course Completion")

    # ── Certificate body ──────────────────────────────────────
    c.setFillColor(colors.HexColor("#1e1b4b"))
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 130, "This is to certify that")

    # Student name
    c.setFillColor(colors.HexColor("#4338ca"))
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(width / 2, height - 170, student_name)

    # Underline for name
    name_width = c.stringWidth(student_name, "Helvetica-Bold", 34)
    c.setStrokeColor(colors.HexColor("#818cf8"))
    c.setLineWidth(1.5)
    c.line(
        width / 2 - name_width / 2 - 10,
        height - 178,
        width / 2 + name_width / 2 + 10,
        height - 178,
    )

    # Branch / ID
    if branch:
        c.setFillColor(colors.HexColor("#6b7280"))
        c.setFont("Helvetica-Oblique", 11)
        c.drawCentredString(width / 2, height - 200, f"{branch}  ·  Student ID: {student_id}")

    # Has successfully completed
    c.setFillColor(colors.HexColor("#374151"))
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 230, "has successfully completed the course")

    # Course name
    c.setFillColor(colors.HexColor("#1e1b4b"))
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 265, course_name)

    # Course ID
    c.setFillColor(colors.HexColor("#6366f1"))
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, height - 282, f"Course ID: {course_id}")

    # CGPA if available
    if cgpa:
        c.setFillColor(colors.HexColor("#059669"))
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(width / 2, height - 305, f"Current CGPA: {cgpa:.1f} / 10.0")

    # Date and certificate id
    c.setFillColor(colors.HexColor("#6b7280"))
    c.setFont("Helvetica", 10)
    c.drawCentredString(
        width / 2, height - 330, f"Completed on: {completion_date}"
    )

    # ── Bottom section: signatures ──────────────────────────────
    sig_y = 65
    third = width / 3

    # Signature 1 — Instructor
    c.setStrokeColor(colors.HexColor("#4f46e5"))
    c.setLineWidth(1)
    c.line(third * 0.4, sig_y + 18, third * 1.1, sig_y + 18)
    c.setFillColor(colors.HexColor("#1e1b4b"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(third * 0.75, sig_y + 6, instructor_name)
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#6b7280"))
    c.drawCentredString(third * 0.75, sig_y - 6, "Course Instructor")

    # Signature 2 — EduPredict
    c.setStrokeColor(colors.HexColor("#4f46e5"))
    c.line(third * 1.3, sig_y + 18, third * 2.0, sig_y + 18)
    c.setFillColor(colors.HexColor("#4f46e5"))
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(third * 1.65, sig_y + 6, "EduPredict AI")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#6b7280"))
    c.drawCentredString(third * 1.65, sig_y - 6, "Academic Excellence Platform")

    # Signature 3 — Certificate ID
    c.setStrokeColor(colors.HexColor("#4f46e5"))
    c.line(third * 2.2, sig_y + 18, third * 2.9, sig_y + 18)
    c.setFillColor(colors.HexColor("#1e1b4b"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(third * 2.55, sig_y + 6, "Verified ✓")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#9ca3af"))
    c.drawCentredString(third * 2.55, sig_y - 6, f"Cert ID: {certificate_id[:16]}")

    # ── Achievement badge ────────────────────────────────────────
    badge_x, badge_y = width - 90, height - 170
    c.setFillColor(colors.HexColor("#fef3c7"))
    c.circle(badge_x, badge_y, 38, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#f59e0b"))
    c.setLineWidth(2)
    c.circle(badge_x, badge_y, 38, fill=0, stroke=1)
    c.setFillColor(colors.HexColor("#92400e"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(badge_x, badge_y + 12, "COURSE")
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(badge_x, badge_y - 2, "✓")
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(badge_x, badge_y - 16, "COMPLETE")

    c.save()
    return buf.getvalue()
