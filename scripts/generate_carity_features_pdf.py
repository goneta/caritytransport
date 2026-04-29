from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "deliverables"
PDF_PATH = OUT_DIR / "Carity Thunderfam Branded v2.pdf"
LOGO_PATH = Path(r"C:\Users\FZ-G2\Desktop\thunderfam_logo1.jpeg")


styles = getSampleStyleSheet()
TITLE = ParagraphStyle(
    "CarityTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=24,
    leading=28,
    textColor=colors.HexColor("#0D3B3F"),
    alignment=TA_LEFT,
    spaceAfter=8,
)
SUBTITLE = ParagraphStyle(
    "CaritySubtitle",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    textColor=colors.HexColor("#1F2529"),
    spaceAfter=10,
)
BODY = ParagraphStyle(
    "CarityBody",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.6,
    leading=13,
    textColor=colors.HexColor("#212529"),
    spaceAfter=6,
)
SECTION = ParagraphStyle(
    "CaritySection",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=15,
    leading=19,
    textColor=colors.HexColor("#0D3B3F"),
    spaceBefore=6,
    spaceAfter=6,
)
NOTE_TITLE = ParagraphStyle(
    "CarityNoteTitle",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=10,
    leading=13,
    textColor=colors.HexColor("#0D3B3F"),
    spaceAfter=3,
)
SMALL = ParagraphStyle(
    "CaritySmall",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8.7,
    leading=11.5,
    textColor=colors.HexColor("#4F5B66"),
    spaceAfter=4,
)
DETAILS = ParagraphStyle(
    "CarityDetails",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9,
    leading=11.5,
    textColor=colors.HexColor("#4F5B66"),
    spaceAfter=2,
)


def p(text: str, style=BODY) -> Paragraph:
    return Paragraph(text, style)


def note_box(title: str, body: str, bg: str) -> Table:
    table = Table([[p(title, NOTE_TITLE)], [p(body, BODY)]], colWidths=[170 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#D7E3E5")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def feature_table(rows: list[list[str]]) -> Table:
    data = [[
        p("Area", NOTE_TITLE),
        p("What the User Can Do", NOTE_TITLE),
        p("Business Value", NOTE_TITLE),
    ]]
    for row in rows:
        data.append([p(row[0], BODY), p(row[1], BODY), p(row[2], BODY)])

    table = Table(data, colWidths=[44 * mm, 60 * mm, 66 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D3B3F")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D5DBDF")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#DDE3E7")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFB")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def build_header_block() -> list:
    story = []
    if LOGO_PATH.exists():
        img_reader = ImageReader(str(LOGO_PATH))
        width_px, height_px = img_reader.getSize()
        target_width = 150 * mm
        target_height = target_width * (height_px / width_px)
        story.append(Image(str(LOGO_PATH), width=target_width, height=target_height))
        story.append(Spacer(1, 5))
    story.append(p("Thunderfam Group", SUBTITLE))
    story.append(p("Address: 152 Tower road, Oldbury, B69 1PE", DETAILS))
    story.append(p("Tel: +4407362703933", DETAILS))
    story.append(Spacer(1, 8))
    return story


def build_pdf() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
    )

    story = build_header_block() + [
        p("Carity", TITLE),
        p("Application Features Overview", SUBTITLE),
        p(
            "Client-facing summary of the school transport workflows, dashboards, and operational controls currently represented in the Carity codebase.",
            SMALL,
        ),
        Spacer(1, 4),
        note_box(
            "Executive Summary",
            "Carity is a role-based school transport platform designed for administrators, schedulers, drivers, parents, and pupils. The application covers route creation, seat booking, pupil management, QR-based boarding checks, notifications, reporting, compliance document storage, customer support workflows, and recruitment administration.",
            "#F4F8F8",
        ),
        Spacer(1, 8),
        feature_table(
            [
                ["Primary users", "Admin teams, drivers, parents, and pupils.", "Supports both internal operations and family self-service."],
                ["Core purpose", "Manage school transport safely from registration through daily operations.", "Unifies planning, service delivery, and support."],
            ]
        ),
        Spacer(1, 10),
        p("Platform At a Glance", SECTION),
        p("The platform is organised around separate dashboards for each operational role. This makes the application useful both as a parent-facing service and as an internal transport operations system."),
        feature_table(
            [
                ["Role-based access", "Separate experiences for admin, driver, parent, and pupil users.", "Keeps each user focused on the tasks relevant to them."],
                ["Identity and access", "Login, registration, user profiles, status tracking, and QR identity cards.", "Supports secure access and traceable user activity."],
                ["Operational data model", "Central records for schools, pupils, parents, vehicles, drivers, bookings, payments, documents, and support cases.", "Creates one shared source of truth across the transport workflow."],
            ]
        ),
        Spacer(1, 10),
        p("Administrative Features", SECTION),
        feature_table(
            [
                ["Dashboard and alerts", "View totals for pupils, routes, vehicles, drivers, parents, recent activity, and pending actions such as expiring licences or insurance.", "Gives leadership a live operating snapshot."],
                ["People management", "Maintain parent, pupil, and employee records, including contact details, status, transport eligibility, and profile information.", "Improves onboarding and daily record keeping."],
                ["Fleet management", "Manage transport companies, drivers, vehicles, MOT records, insurance, and licence classes.", "Supports safety, compliance, and contractor oversight."],
                ["Route scheduling", "Create, edit, clone, and monitor routes with service type, recurrence, school links, postcodes, pricing, driver assignment, and vehicle capacity.", "Makes route planning practical and scalable."],
                ["Capacity and utilisation", "See assigned seats against vehicle capacity and highlight full or high-utilisation routes.", "Helps prevent overbooking and improves planning decisions."],
                ["Resolution centre", "Handle complaints and refund requests, update ticket status, add parent replies, and process refund outcomes.", "Provides a structured support workflow."],
                ["Analytics", "Charts for revenue, booking status, route utilisation, fleet mix, and driver status.", "Turns operational data into management insight."],
                ["Document vault", "Upload and track DBS, insurance, MOT, and licence documents with expiry dates linked to drivers or vehicles.", "Strengthens compliance management."],
                ["Recruitment module", "Review job applications, schedule interviews, hire candidates, create employee credentials, and keep internal notes.", "Extends the platform into staff recruitment and onboarding."],
            ]
        ),
        Spacer(1, 10),
        p("Parent Experience", SECTION),
        feature_table(
            [
                ["Parent dashboard", "See registered children, active routes, unread alerts, and a personal QR identity card.", "Provides a simple command centre for families."],
                ["Child management", "Register children, store school details, special requirements, emergency contacts, and transport status.", "Captures safeguarding and operational information."],
                ["Transport search", "Search for available routes by postcode, school, trip type, date, and preferred time.", "Makes discovery easy for families."],
                ["Seat selection", "Choose a vehicle, view seat availability, and assign a seat to a specific child before booking.", "Creates a transparent self-service booking flow."],
                ["Basket and checkout", "Build a basket of journeys, review totals, and move through a protected payment-confirmation flow with seat conflict checks.", "Reduces booking errors and improves purchase confidence."],
                ["Live tracking screen", "View route progress, vehicle details, and timeline-style journey status updates for each child.", "Improves reassurance and visibility for parents."],
                ["Resolution centre", "Raise refund requests, complaints, or other support issues, and continue the conversation with support staff.", "Creates a clear customer service path."],
            ]
        ),
        Spacer(1, 10),
        p("Driver Experience", SECTION),
        feature_table(
            [
                ["Driver dashboard", "See assigned routes, total pupils, schedule summaries, and a personal QR identity card.", "Gives drivers a clear start-of-day view."],
                ["Schedule and route views", "Access route lists, route timing, vehicle details, and assigned passenger counts.", "Supports route readiness and execution."],
                ["Manifest and attendance", "Review assigned pupils and mark boarded or absent status from the route view.", "Helps drivers manage day-of-service operations."],
                ["QR boarding scanner", "Scan or paste pupil QR data, validate whether the pupil is booked, and display emergency or parent contact details.", "Improves boarding control and safeguarding confidence."],
                ["Trip logging", "Log boarding and route events to trip records when QR scans occur.", "Creates a record of operational activity."],
            ]
        ),
        Spacer(1, 10),
        p("AI Chatbot", SECTION),
        feature_table(
            [
                ["Parent queries", "Parent can query about platform overview, route schedules, available routes, pending applications, and company info.", "Gives users a faster self-service support experience."],
                ["AI-powered responses", "The chatbot is powered by AI models and presents guidance directly inside the platform.", "Helps reduce repetitive support enquiries and improves response speed."],
            ]
        ),
        Spacer(1, 10),
        p("Support, Safety, and Control", SECTION),
        feature_table(
            [
                ["AI assistant", "Offer contextual chat support for parents, drivers, and administrators, using role-aware prompts and stored conversation history.", "Improves support responsiveness and self-service guidance."],
                ["Notifications", "Store outbound notifications and support ticket replies in the platform database.", "Keeps communication traceable."],
                ["Compliance records", "Track driver, vehicle, insurance, DBS, and licence records in the core data model.", "Supports safeguarding and operational compliance."],
                ["Exception handling", "Manage holiday periods, absences, and driver unavailability with substitute assignment workflows.", "Helps maintain service continuity."],
                ["Auditability", "Store trip logs, audit logs, support tickets, and payment-related booking data.", "Improves accountability and reporting."],
            ]
        ),
        Spacer(1, 10),
        p("Implementation Notes", SECTION),
        note_box(
            "Important Context for Client Conversations",
            "The codebase includes the full product structure for payments, live tracking, and AI support, but some flows still depend on configuration or further production wiring. For example, the tracking screen currently shows a map placeholder until a maps key is configured, and the checkout route presently simulates a successful payment rather than creating a live Stripe checkout session. These are best presented as implementation-stage items rather than fully deployed production integrations.",
            "#FFF7E8",
        ),
        Spacer(1, 10),
        p("Pricing and External Services", SECTION),
        p("The proposed price for the Carity web application is £5,000. This covers the main platform scope represented in the application, including administration, parent and driver dashboards, route scheduling, seat booking, QR boarding, notifications, reporting, compliance document handling, support workflows, and recruitment features."),
        feature_table(
            [
                ["Platform price", "Full Carity web application.", "£5,000 total."],
                ["AI chatbot", "Uses an external AI model provider for conversational support.", "Client subscription required with providers such as Anthropic or OpenAI."],
                ["Text messaging", "SMS notifications require an external messaging provider.", "Client subscription required with Twilio."],
                ["Online payments", "Stripe is required for live card payment processing.", "Client must create and maintain a Stripe account."],
                ["Domain and hosting", "Live deployment infrastructure and domain registration.", "External charge of £45, not included in the £5,000 platform price."],
            ]
        ),
        Spacer(1, 8),
        note_box(
            "Client Setup Requirements",
            "To operate the live service, the client will need to create their own Stripe account for online payments, an AI account with a provider such as Anthropic or OpenAI for chatbot usage, and a Twilio account for SMS messaging. These third-party subscriptions and usage charges are separate from the £5,000 web application price.",
            "#EEF6F6",
        ),
        Spacer(1, 10),
        p("Conclusion", SECTION),
        p("Based on the current codebase, Carity is positioned as a comprehensive school transport management application rather than a simple booking portal. It combines family self-service, operational control, driver tooling, compliance records, and support workflows in one platform."),
        p("This document was prepared from the implemented routes, pages, APIs, and data model in the repository on 27 April 2026.", SMALL),
    ]

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
