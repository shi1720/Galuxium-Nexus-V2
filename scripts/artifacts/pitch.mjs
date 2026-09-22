import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const root = path.resolve(import.meta.dirname, '../..');
const build = path.join(import.meta.dirname, '.build');
const skill = process.env.PACTSHIFT_PRESENTATIONS_SKILL ?? path.join(os.homedir(),'.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations');
const runtime = process.env.PACTSHIFT_RUNTIME ?? path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies');
process.env.RUNTIME_NODE_MODULES = path.join(runtime,'node/node_modules');
process.env.RUNTIME_NODE = path.join(runtime,'node/bin/node');
const { finalizePresentation, applyPresentationChartFont } = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')));
const C = { ink:'#172E29', paper:'#F7F8F5', green:'#167D5A', lime:'#DFF2AE', muted:'#5E716A', line:'#D8DFD8', white:'#FFFFFF' };
const deck = Presentation.create({slideSize:{width:1280,height:720}});
const cfg = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'facts.json'), 'utf8'));

function text(slide, value, x,y,w,h, size=26, color=C.ink, bold=false, font='Arial') {
  const s=slide.shapes.add({geometry:'textbox',name:value.slice(0,55),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  s.text=value; s.text.style={typeface:font,fontSize:size,color,bold,autoFit:'none',verticalAlignment:'top',wrap:true}; return s;
}
function rule(slide,x,y,w,color=C.line){ slide.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:1},fill:color,line:{fill:'none',width:0}}); }
function base(num, dark=false){const s=deck.slides.add();s.background.fill=dark?C.ink:C.paper;text(s,'PACTSHIFT',64,32,250,32,18,dark?C.lime:C.green,true);text(s,String(num).padStart(2,'0'),1160,32,55,32,18,dark?C.lime:C.muted);return s;}
function heading(s,value){text(s,value,64,100,1152,125,52,C.ink,true);}
function note(s,value){s.speakerNotes.textFrame.setText(value);}
function table(s, rows, widths, y, h){
 const t=s.tables.add({rows:rows.length,columns:rows[0].length,left:64,top:y,width:1152,height:h,columnWidths:widths,values:rows});
 t.borders.assign({fill:C.line,width:1,style:'solid'});
 t.cells.block({row:0,column:0,rowCount:rows.length,columnCount:rows[0].length}).assign({fill:C.paper,textStyle:{typeface:'Arial',fontSize:24,color:C.ink},margins:{left:18,right:18,top:15,bottom:15}});
 t.cells.block({row:0,column:0,rowCount:1,columnCount:rows[0].length}).assign({fill:C.ink,textStyle:{typeface:'Arial',fontSize:21,color:C.white,bold:true}});
 return t;
}

// 1: Minimal editorial cover.
{
const s=base(1,true);
text(s,'Pactshift',64,160,1130,150,112,C.paper,true);
text(s,'Scope changes your\nclients can approve',68,340,1110,160,57,C.lime,false,'Georgia');
text(s,'Shivam Gupta  /  Founder and builder',68,605,1060,45,24,C.paper);
note(s,'Pactshift is software for fixed-fee agencies to turn a new client request into an explicit add, swap, or defer decision. Founder and builder: Shivam Gupta. Development uses AI assistance. This deck presents the product implementation and business hypotheses, without claiming customer traction.');
}
// 2: Exact illustrative economics, not a market statistic.
{
const s=base(2);heading(s,'The cost of “one more thing”');
text(s,'“Could we add Spanish pages\nbefore launch?”',66,252,545,145,38,C.ink,false,'Georgia');
text(s,`A ${cfg.example.hours}-hour request adds $${cfg.example.laborCost.toLocaleString()}\nof estimated delivery labor.`,66,435,535,90,28,C.muted);
text(s,'A fixed fee stays fixed until\nsomeone changes the agreement.',66,550,535,90,28,C.ink,true);
const chart=s.charts.add('bar',{position:{left:655,top:246,width:540,height:310},categories:['Original plan','Absorb request'],series:[{name:'Gross margin',values:[cfg.example.margin,cfg.example.absorbMargin],fill:C.green,points:[{idx:1,fill:'#AAC5B7'}],valuesFormatCode:'0.0%'}],barOptions:{direction:'column',grouping:'clustered',gapWidth:90},hasLegend:false,xAxis:{textStyle:{fontSize:23,fill:C.ink},line:{fill:C.line,width:1},majorGridlines:null},yAxis:{visible:false,min:0,max:0.65,numberFormatCode:'0%',majorGridlines:null},dataLabels:{showValue:true,position:'outEnd',textStyle:{fontSize:30,fill:C.ink,bold:true}},chartFill:C.paper,plotAreaFill:C.paper});
applyPresentationChartFont(chart,{fontFamily:'Arial'});
text(s,'Margin after delivery labor (illustrative)',675,580,500,32,20,C.muted);
text(s,`$${cfg.example.budget.toLocaleString()} fee, ${cfg.example.baselineHours}h at $${cfg.example.costRate}/h delivery cost.`,675,618,510,32,18,C.muted);
note(s,`Illustrative example only, not observed customer results. Assumptions: budget USD ${cfg.example.budget}, baseline ${cfg.example.baselineHours} hours, delivery cost USD ${cfg.example.costRate}/hour, extra request ${cfg.example.hours} hours. Original gross margin = (fee - baseline hours * cost rate)/fee. Absorbed margin = (fee - (baseline hours + extra hours)*cost rate)/fee. Gross margin excludes overhead, taxes, and non-labor cost. Source: product demonstration scenario and docs/BUSINESS.md. Upwork's fixed-price freelancer field guide independently describes scope creep and add/swap/defer responses: https://www.upwork.com/mc/documents/caf2f4f2e8dab00fc04b3408465eedb3`);
}
// 3: Editable comparison describes the actual decision model.
{
const s=base(3);heading(s,'A request becomes a clear choice');
table(s,[['Client choice','Trade-off','Project result'],['Add',`+$${cfg.example.fee.toLocaleString()} for ${cfg.example.hours} hours`,'Budget and scope increase'],['Swap',`Replace ${cfg.example.swapHours} hours of eligible work`,'New scope, same budget'],['Defer','Keep the current plan','Baseline stays unchanged']],[230,435,487],260,270);
text(s,'Pactshift applies the accepted choice to the project baseline.',64,566,1130,70,30,C.green,true);
text(s,'A share link records the decision. Version checks stop conflicting approvals.',64,639,1150,36,22,C.muted);
note(s,'Source: docs/BUILD_CONTRACT.md, shared/types.ts, server domain model. Amounts are illustrative demonstration values. The swap option requires planned, unlocked deliverables with sufficient estimated capacity and no active dependents. Add inserts the requested deliverable and increases budget. Swap retires selected deliverables and adds the request at the existing budget. Defer leaves the baseline unchanged. The decision receipt records the current version, client name, and selected option. This is an operational acknowledgment, not a claim of a certified digital signature.');
}
// 4: The real application, never an invented mockup.
{
const s=base(4);text(s,'The request beside the agreement',64,94,1152,87,50,C.ink,true);
if(cfg.screenshot){
 const bytes=await fs.readFile(path.resolve(root,cfg.screenshot));
 s.images.add({blob:bytes,contentType:'image/png',alt:'Pactshift actual request review, evidence and proposed options with fictional sample data; cropped from the application screenshot',fit:'contain',position:{left:64,top:185,width:1152,height:460}});
} else {
 text(s,'Estimate the work.\nReview the evidence.\nShare the choices.',64,235,1110,280,58,C.ink,false,'Georgia');
}
text(s,'Actual product workflow using a fictional demonstration project',64,659,1138,30,19,C.muted);
note(s,'Source: docs/images/request.png, a native browser capture from the working local Pactshift application. This slide crops the image to the request, scope evidence and proposed options. The demonstration workspace is fictional and isolated from real customer data. This is the owner review screen, not the client offer. The screenshot remains a raster image and the surrounding text remains editable. '+(cfg.liveUrl?`Live application: ${cfg.liveUrl}`:''));
}
// 5: Native, editable architecture diagram with data boundaries.
{
const s=base(5);heading(s,'An approval changes the system');
const cols=[64,460,856];
['Review','Validate','Commit'].forEach((label,i)=>{
text(s,String(i+1).padStart(2,'0'),cols[i],246,120,67,44,C.green,true);
text(s,label,cols[i],326,340,65,36,C.ink,true);
});
text(s,'An agency reviews scope\nevidence and effort. The\nclient picks an option.',64,412,330,130,27,C.muted);
text(s,'The API checks tenant,\nprice, capacity, expiry\nand baseline version.',460,412,345,130,27,C.muted);
text(s,'One transaction updates\nthe baseline and records\nthe audit event.',856,412,340,130,27,C.muted);
rule(s,64,579,1152);
text(s,'AI suggests. People decide. The server enforces the agreement.',64,611,1152,65,29,C.green,true);
note(s,'Architecture and implemented controls are documented in docs/BUILD_CONTRACT.md and source. React/Vite client, Express/TypeScript API, Firestore durable storage adapter, and local JSON adapter. Tenant checks apply to private routes. Public offers expose a limited client view. Server-side arithmetic controls prices. Acceptance validates the current baseline and mutates the workspace atomically. SHA-256 chained audit events help detect edits but are not externally anchored or tamper-proof against privileged rewriting. AI analysis may use Vertex Gemini with validated citations, or a disclosed rules fallback. Neither engine accepts agreements or sets prices. Current product boundaries include one owner per workspace, 30 requests per project, 100 audit events per project, 50 baseline versions per project, and 720,000 bytes of workspace storage. Stored-project quotas include archived projects. Client approvals are included within these bounds, not unlimited. The product makes no compliance certification claim.');
}
// 6: Pricing remains proposed until paid validation.
{
const s=base(6);heading(s,'A flat subscription for each workspace');
table(s,[['Plan','Monthly price','Stored projects','Analyses / month'],['Free','$0','3','30'],['Studio','$29','15','300'],['Agency','$79','60','1,500']],[305,290,255,302],251,272);
text(s,'No percentage fee on the changes a client accepts.',64,567,1136,53,32,C.green,true);
text(s,'Proposed pricing. Archived projects count toward the limit. Client approvals are included.',64,640,1152,37,21,C.muted);
note(s,'Source: docs/BUSINESS.md and the implementation plan. Prices are USD per workspace per month, a launch hypothesis rather than validated willingness to pay. Stripe checkout and signed webhook integration require merchant configuration. No live payment or revenue claim. Stored-project quotas include archived projects. Client approvals are included within explicit storage limits: 30 requests, 100 audit events and 50 baseline versions per project, and 720,000 bytes per workspace. A project allowance does not promise every project can reach every object limit simultaneously. Illustrative AI cost: Gemini 2.5 Flash-Lite at USD 0.10/1M input tokens and USD 0.40/1M output tokens yields USD 0.001 per analysis at 6,000 input plus 1,000 output tokens. At full included allowance this is USD 0.30 Studio or USD 1.50 Agency before retries, hosting, storage, support, payment processing, and tax. Source: https://cloud.google.com/vertex-ai/generative-ai/pricing accessed 2026-09-22. Rates and providers can change.');
}
// 7: Honest commercial plan and demo invitation.
{
const s=base(7,true);
text(s,'Built for the next\nfixed-fee change',64,137,1110,170,65,C.paper,true);
text(s,'Initial buyer',64,365,415,43,26,C.lime,true);
text(s,'Small web and design agencies\nwith repeated scope negotiations.',64,429,540,112,31,C.paper);
text(s,'Validation plan',715,365,450,43,26,C.lime,true);
text(s,'Five design partners using real\nrequests. Measure paid renewals\nand time to agreement.',715,429,470,140,28,C.paper);
text(s,'Shivam Gupta  /  Founder and builder',64,616,600,42,22,C.paper);
text(s,cfg.liveUrl?cfg.liveUrl.replace('https://',''):'github.com/shi1720/Galuxium-Nexus-V2',64,663,1110,32,19,C.lime);
note(s,'Commercial hypothesis: begin with small agencies selling web/design work at fixed fees. Recruit five design partners with consent, run real requests, and measure time to a client decision, accepted value, repeat use, and willingness to pay. These are planned validation steps, not completed traction. Competitive differentiation is the executable add/swap/defer baseline workflow with explicit capacity checks and a flat subscription. Similar products already exist, including ScopeGuardian, ScopeApproval, and ScopePilot. Source links and comparison limits: docs/MARKET.md. Founder and builder: Shivam Gupta. AI-assisted engineering and content production. Repository: https://github.com/shi1720/Galuxium-Nexus-V2. '+(cfg.liveUrl?`Live application: ${cfg.liveUrl}`:''));
}

await fs.mkdir(build,{recursive:true});
await fs.mkdir(path.join(root,'deliverables'),{recursive:true});
const revision=Date.now();
const candidatePath=path.join(build,`pitch-${revision}.pptx`);
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
for(let i=0;i<deck.slides.items.length;i++){
 const blob=await deck.export({slide:deck.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
 const layout=await deck.slides.items[i].export({format:'layout'});
 await fs.writeFile(path.join(build,`slide-${i+1}.layout.json`),await layout.text());
}
const finalizedPath=path.join(root,'deliverables',`Pactshift-pitch-${revision}.pptx`);
await finalizePresentation({
 workspaceDir:root,candidatePath,finalPath:finalizedPath,
 pythonExecutable:path.join(runtime,'python/bin/python3'),
 integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','3','--require-native-table-slide','6'],
 explicitTotalSlideCount:7,requiredNativeTableOwnerSlides:[3,6],requiredNativeChartOwnerSlides:[2],
 materializeLiteralChartWorkbooks:true,
 fontPolicy:{basis:'design',families:['Arial','Georgia']},verifyArtifactToolImport:true,
 receiptPath:path.join(build,`pitch-validation-${revision}.json`),
});
await fs.copyFile(finalizedPath,path.join(root,'deliverables/Pactshift-pitch.pptx'));
await fs.copyFile(path.join(build,`pitch-validation-${revision}.json`),path.join(build,'pitch-validation.json'));
await fs.unlink(finalizedPath);
console.log('Built seven-slide editable deck and rendered previews.');
