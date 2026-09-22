"""Build the Pactshift executive brief from reviewed product facts.

Uses native PDF text and tables. Product imagery is a real application screenshot.
Runtime: bundled ReportLab/Pillow. All factual sources appear in the brief.
"""
import json
import os
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FACTS = json.loads((Path(__file__).parent / 'facts.json').read_text())
if FACTS.get('screenshotSource') and FACTS.get('screenshotCropPixels'):
    Image.open(ROOT / FACTS['screenshotSource']).crop(tuple(FACTS['screenshotCropPixels'])).save(ROOT / FACTS['screenshot'])
OUT = ROOT / 'deliverables/Pactshift-brief.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT_DIR=Path(os.environ.get('PACTSHIFT_FONT_DIR','/System/Library/Fonts/Supplemental'))
for name, file in [('Sans', 'Arial.ttf'), ('Sans-Bold','Arial Bold.ttf'), ('Serif','Georgia.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR/file)))
pdfmetrics.registerFontFamily('Sans',normal='Sans',bold='Sans-Bold',italic='Sans',boldItalic='Sans-Bold')
C = dict(ink=HexColor('#172E29'), paper=HexColor('#F7F8F5'), green=HexColor('#167D5A'), lime=HexColor('#DFF2AE'), muted=HexColor('#5E716A'), line=HexColor('#D8DFD8'))
W,H=595.276,841.89
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('Pactshift - Executive brief')
c.setAuthor('Shivam Gupta')
c.setSubject('Scope change agreements for fixed-fee agencies')

def para(value,x,y,width,size=11.4,color='ink',font='Sans',leading=None):
    style=ParagraphStyle('body',fontName=font,fontSize=size,leading=leading or size*1.42,textColor=C.get(color,color),spaceAfter=0)
    p=Paragraph(value,style); _,ht=p.wrap(width,H); p.drawOn(c,x,H-y-ht); return y+ht
def txt(value,x,y,size=12,color='ink',font='Sans'):
    c.setFont(font,size);c.setFillColor(C.get(color,color));c.drawString(x,H-y-size*.8,value)
def rule(y,x=44,w=W-88):
    c.setStrokeColor(C['line']);c.setLineWidth(.6);c.line(x,H-y,x+w,H-y)
def page(num,label,dark=False):
    c.setFillColor(C['ink'] if dark else C['paper']);c.rect(0,0,W,H,fill=1,stroke=0)
    txt('PACTSHIFT',44,31,11,'lime' if dark else 'green','Sans-Bold')
    txt(label.upper(),174,33,8.5,'lime' if dark else 'muted')
    txt(f'{num:02}',528,32,10,'lime' if dark else 'muted')
def footer():
    rule(789);txt('Shivam Gupta  /  Galuxium Nexus V2',44,803,8.4,'muted');txt('22 September 2026',443,803,8.4,'muted')
def title(value,y=79): return para(value,44,y,W-88,32,'ink','Sans-Bold',36)
def section(label,body,y,x=44,w=W-88):
    y=para(label,x,y,w,14,'green','Sans-Bold',18)+9
    return para(body,x,y,w)+18
def table(rows,y,widths,row_font=10.2):
    data=[]
    for ri,row in enumerate(rows):
        data.append([Paragraph(str(cell),ParagraphStyle('cell',fontName='Sans-Bold' if ri==0 else 'Sans',fontSize=row_font,leading=row_font*1.35,textColor=C['paper'] if ri==0 else C['ink'])) for cell in row])
    t=Table(data,colWidths=widths,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),C['ink']),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('LINEBELOW',(0,0),(-1,-1),.5,C['line'])]))
    _,ht=t.wrap(sum(widths),H);t.drawOn(c,44,H-y-ht);return y+ht
def link(label,url,x,y,w,size=8.4):
    return para(f'<a href="{escape(url)}" color="#167D5A">{escape(label)}</a>',x,y,w,size,'green',leading=11.5)

# 1. Executive summary
page(1,'Executive brief',True)
txt('Pactshift',44,104,59,'paper','Sans-Bold')
para('Scope changes your<br/>clients can approve',44,190,507,31,'lime','Serif',38)
para('A client asks for more. Pactshift turns the request into an explicit choice about budget or deliverables, then updates the project everyone agreed to.',44,298,498,14.5,'paper',leading=21)
if FACTS.get('screenshot'):
    img=ImageReader(str(ROOT/FACTS['screenshot']));iw,ih=img.getSize();maxw,maxh=507,245;scale=min(maxw/iw,maxh/ih);dw,dh=iw*scale,ih*scale
    c.drawImage(img,44+(507-dw)/2,H-398-dh,width=dw,height=dh,mask='auto')
    txt('Actual application. Fictional demonstration project.',44,659,8.4,'lime')
else:
    para('Add the budget.<br/>Exchange planned work.<br/>Keep the current agreement.',44,420,507,25,'lime','Serif',35)
para('<b>For founders and delivery leads at small web and design agencies.</b><br/>A focused workflow alongside their existing project tools.',44,701,507,11.7,'paper',leading=17)
txt('Shivam Gupta  /  Founder and builder',44,800,10,'paper')
c.showPage()

# 2. Commercial case
page(2,'Customer and market');title('A familiar negotiation.<br/>A clearer agreement.')
y=section('The buyer and the trigger','The initial buyer is the owner or delivery lead of a 2-15 person web or product design agency. A fixed-fee project is already underway. The client asks for another language, integration, page, or revision before delivery. The team needs to agree on the consequence before starting the work.',177)
y=section('The friction','Email and project boards can capture a request without changing the underlying commercial agreement. The agency may absorb work, negotiate a separate fee, or exchange planned deliverables. Upwork documents these same responses to scope creep. That establishes a recognizable practice, not proven demand for this product. [1]',y)
txt('A focused competitive position',44,y,14,'green','Sans-Bold');y+=28
y=table([['Existing option','What Pactshift must earn'],['ScopePilot: contract analysis<br/>and change orders, EUR 4.99/mo [2]','Analysis alone is already inexpensive.'],['ScopeGuardian: cited analysis and approvals.<br/>Post-beta $99/mo + 5% of changes,<br/>percentage fees capped at $5,000/year [3]','Citations and approval links alone do not differentiate.'],['ScopeApproval: approvals and<br/>receipts, $27 / $47 / $97 [4]','The full decision must be fast and clear.']],y,[251,256],10.2)+19
y=section('The differentiation hypothesis','Pactshift makes an accepted scope swap executable: it names the work removed, checks eligibility and capacity, adds the new deliverable, and saves the new baseline atomically. Flat subscriptions leave the approved value with the agency. This is a product focus, not a claim of category invention.',y)
para('Research status: desk research only. No verified users, customers, or revenue. Vendor prices and feature claims were reviewed on 22 September 2026 and can change.',44,y,507,9.1,'muted',leading=12.8)
footer();c.showPage()

# 3. End-to-end story
page(3,'Product workflow');title('One request.<br/>Three explicit choices.')
para('Fictional example: Northstar Studio is delivering the Forma website. The client requests 12 hours of Spanish-language pages and supplies approved Spanish copy.',44,177,507,12.4,leading=18)
y=table([['Choice','Commercial consequence','Saved project'],['Add','$1,500 proposed fee<br/>12 hours at $125/hour<br/>2 calendar days added','Budget: $12,000 to $13,500<br/>Effort: 96h to 108h'],['Swap','Exchange the 16-hour<br/>resource library for<br/>12 hours of Spanish pages','Budget: $12,000 unchanged<br/>Effort: 96h to 92h'],['Defer','Continue the agreed work','Budget, date, scope unchanged']],249,[70,207,230],10.5)+24
y=section('The complete workflow','The owner creates a scoped project, records the request, reviews the analysis and effort, and shares a limited client link. The client sees the options and acknowledges one. The API applies the result to the current project and records a decision receipt. Reloading preserves the new state.',y)
y=section('Rules that protect the agreement','Only planned, unlocked work without active dependents can be swapped. The selected capacity must cover the new request. The server computes the fee. A stale baseline cannot be accepted, and repeating an accepted request cannot duplicate work. Deferral records a decision without changing the baseline.',y)
para('All figures above describe the seeded demonstration. A proposed or approved fee is not money collected. Four freed hours are capacity, not revenue. The acknowledgment records a named choice, without independently verifying the signer.',44,y,507,9.3,'muted',leading=13.2)
footer();c.showPage()

# 4. Architecture and governance
page(4,'Architecture and governance');title('Deterministic decisions.<br/>Bounded AI assistance.')
y=table([['Layer','Responsibility'],['React / Vite client','Project setup, review, client decision, receipts, settings.'],['Express / TypeScript API','Authentication, tenant checks, price calculation, quotas, validation and acceptance.'],['Firestore adapter','Durable workspace state and atomic mutation. Local JSON adapter supports a zero-credential local run.'],['Optional Vertex AI','Scope analysis with validated evidence citations. Disclosed rules fallback when AI is unavailable.'],['Optional Stripe','Hosted subscription checkout and portal. Signed, replay-safe webhooks update plan state.']],174,[141,366],10.3)+21
y=section('The transaction is the trust boundary','Acceptance checks token expiry, request status, current baseline version, and swap eligibility. A single mutation updates scope and budget, preserves the baseline history, and appends the chained audit event. AI cannot authorize a change or set prices.',y)
y=section('Data protection in the product','Private routes enforce the workspace owner. Sessions use HttpOnly cookies, with Secure in production, SameSite protection and CSRF checks. Public offers contain a restricted client view. Workspace export excludes credentials and share tokens. Account deletion clears the account and its sessions.',y)
y=section('Operating boundaries','One owner per workspace. Stored projects include archives. Each project allows at most 30 requests, 100 audit events and 50 baseline versions. The workspace limit is 720,000 bytes. Hash chaining is not external notarization. No SSO, team roles, verified signatures or compliance certification. Production operation needs monitoring and a backup policy.',y)
footer();c.showPage()

# 5. Monetization and validation
page(5,'Business model');title('Simple pricing.<br/>Evidence before expansion.')
y=table([['Plan','USD / month','Stored projects','Analyses / month'],['Free','$0','3','30'],['Studio','$29','15','300'],['Agency','$79','60','1,500']],176,[142,113,105,147],10.6)+16
para('Proposed pricing before tax. Archived projects count toward the limit. Client approvals are included within the storage limits on page 4. No percentage fee on approved work. Stripe needs merchant configuration. Subscriptions do not collect the agency\'s client invoices.',44,y,507,10.2,'muted',leading=14.2);y+=69
y=section('A cost model with visible assumptions','At 6,000 input and 1,000 output tokens, Gemini 2.5 Flash-Lite costs an estimated $0.001 per analysis at published rates. At the Studio allowance, a 2x contingency is $0.60/month. Agency is $3.00/month. These are token assumptions, not observed bills. Hosting, storage, support, processing, retries and taxes remain separate. [5]',y)
y=section('The first commercial test','Interview ten qualified agency owners and invite five design partners to run a real change request. Measure client sharing, time to decision, repeat use, and paid continuation. Neither the interviews nor pilots are completed. Usage and actual payment will determine whether the pricing and workflow deserve expansion.',y)
y-=8;rule(y);y+=16
txt('Primary sources and reproducibility',44,y,12,'green','Sans-Bold');y+=24
refs=[('[1] Upwork, scope negotiation guide','https://www.upwork.com/mc/documents/caf2f4f2e8dab00fc04b3408465eedb3'),('[2] ScopePilot, vendor pricing','https://scopepilot.io/'),('[3] ScopeGuardian, vendor pricing','https://scopeguardian.ai/'),('[4] ScopeApproval, vendor pricing','https://www.scopeapproval.com/'),('[5] Google Cloud, generative AI pricing','https://cloud.google.com/vertex-ai/generative-ai/pricing')]
for label,url in refs:y=link(label,url,44,y,507)+3
y=link('Code, architecture, setup, full source pack and validation playbook','https://github.com/shi1720/Galuxium-Nexus-V2',44,y+5,507)+4
if FACTS.get('liveUrl'):y=link('Live Pactshift application',FACTS['liveUrl'],44,y,507)+4
para('Sources reviewed 22 September 2026. Built by Shivam Gupta with AI-assisted engineering and content production. Customer and revenue validation remains outstanding.',44,y+3,507,8.5,'muted',leading=11.5)
footer();c.showPage();c.save()
print(OUT)
