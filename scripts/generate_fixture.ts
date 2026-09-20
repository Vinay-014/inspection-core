import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const fixtureDir = path.join(process.cwd(), 'fixtures/spectora');
if (!fs.existsSync(fixtureDir)) {
  fs.mkdirSync(fixtureDir, { recursive: true });
}

// Typical Spectora HTML-text export structure
// Headers: Section, Item, Comment, HTML Text, Category / Defect
const rows: Record<string, string | number>[] = [
  // --- Section 1: Roofing ---
  {
    "Section": "Roofing",
    "Item": "Roof Coverings",
    "Comment": "Asphalt Shingles - Satisfactory Condition",
    "HTML Text": "<p>The <strong>asphalt architectural shingles</strong> appear to be in satisfactory condition with normal wear consistent with the age of the structure. No missing, displaced, or significantly damaged shingles were observed at the time of inspection.</p>"
  },
  {
    "Section": "Roofing",
    "Item": "Roof Coverings",
    "Comment": "Granule Loss Observed",
    "HTML Text": "<p>Moderate <em>granule loss</em> was noted across the south-facing roof slopes. While the shingles remain functional, this indicates accelerated weathering from sun exposure. Recommend monitoring annually.</p>"
  },
  {
    "Section": "Roofing",
    "Item": "Flashings & Penetrations",
    "Comment": "Plumbing Vent Flashing Boot Deteriorated",
    "HTML Text": "<p>The neoprene rubber boot around the plumbing vent pipe flashing is cracked and weathered. <u>Recommendation:</u> Have a licensed roofing contractor replace the damaged flashing boot to prevent moisture intrusion into the attic space.</p>"
  },
  {
    "Section": "Roofing",
    "Item": "Gutters & Downspouts",
    "Comment": "Debris in Gutters",
    "HTML Text": "<p>Gutters contain accumulated leaves and organic debris. Recommend clearing all gutters and downspouts to ensure proper drainage away from the foundation. Refer to <a href=\"https://www.nachi.org/gutters.htm\" target=\"_blank\">InterNACHI Gutter Maintenance Guidelines</a>.</p>"
  },

  // --- Section 2: Exterior ---
  {
    "Section": "Exterior",
    "Item": "Siding, Flashing & Trim",
    "Comment": "Fiber Cement Siding - Good Condition",
    "HTML Text": "<p>The fiber cement lap siding is properly installed and generally in good condition. Paint finish is intact with no major cracking or loose panels observed.</p>"
  },
  {
    "Section": "Exterior",
    "Item": "Siding, Flashing & Trim",
    "Comment": "Caulking Gaps at Window Trim",
    "HTML Text": "<p>Caulking around several window trim joints on the west elevation has dried and separated. <strong>Recommendation:</strong> Re-caulk with exterior-grade elastomeric sealant to prevent moisture penetration behind siding.</p>"
  },
  {
    "Section": "Exterior",
    "Item": "Walkways, Patios & Driveways",
    "Comment": "Driveway Surface Cracks",
    "HTML Text": "<p>Minor surface settlement cracks (less than 1/4 inch) were observed on the concrete driveway slab. Recommend sealing cracks with flexible concrete joint filler.</p>"
  },
  {
    "Section": "Exterior",
    "Item": "Decks & Porches",
    "Comment": "Deck Ledger Board & Fasteners",
    "HTML Text": "<p>The rear elevated deck ledger board is properly secured with 1/2-inch hot-dipped galvanized through-bolts and approved flashing was present along the house band joist.</p>"
  },

  // --- Section 3: Structural Components ---
  {
    "Section": "Structural Components",
    "Item": "Foundation",
    "Comment": "Poured Concrete Foundation - Normal Settlement",
    "HTML Text": "<p>Poured concrete stem walls are visible in the basement and perimeter. Minor hairline shrinkage cracks noted, which are typical of curing and do not indicate structural displacement at this time.</p>"
  },
  {
    "Section": "Structural Components",
    "Item": "Roof Structure & Attic",
    "Comment": "Attic Framing & Sheathing",
    "HTML Text": "<p>Engineered roof trusses inspected from the attic access hatch. Truss members and gusset plates are securely fastened with no broken web members or signs of water staining observed.</p>"
  },

  // --- Section 4: Electrical System ---
  {
    "Section": "Electrical System",
    "Item": "Main Service Panel",
    "Comment": "200 Amp Service Panel - Square D",
    "HTML Text": "<p>Main service disconnect is rated at <strong>200 Amps</strong>, 120/240V, manufactured by Square D. Copper branch wiring observed. All breakers are clearly labeled on the panel legend.</p>"
  },
  {
    "Section": "Electrical System",
    "Item": "Branch Wiring & Outlets",
    "Comment": "GFCI Protection Operational",
    "HTML Text": "<p>Ground Fault Circuit Interrupter (GFCI) receptacles in the kitchen, bathrooms, and exterior were tested with an approved circuit analyzer and tripped properly within allowable response times.</p>"
  },
  {
    "Section": "Electrical System",
    "Item": "Branch Wiring & Outlets",
    "Comment": "Reverse Polarity at Garage Receptacle",
    "HTML Text": "<p>Testing indicated <em>reverse polarity</em> at the northeast garage wall receptacle. <strong>Recommendation:</strong> A licensed electrician should evaluate and correct the circuit wiring to avoid electrical shock hazards.</p>"
  },

  // --- Section 5: Heating & Cooling (HVAC) ---
  {
    "Section": "Heating & Cooling (HVAC)",
    "Item": "Heating Equipment",
    "Comment": "High-Efficiency Gas Furnace",
    "HTML Text": "<p>The forced-air natural gas furnace responded normally to the thermostat call for heat. Normal burner flame pattern observed. Filter size: 16x25x1.</p>"
  },
  {
    "Section": "Heating & Cooling (HVAC)",
    "Item": "Cooling Equipment",
    "Comment": "Central AC Unit - 3.5 Ton",
    "HTML Text": "<p>Exterior condensing unit was operated in cooling mode. Supply and return air temperature split measured approximately 17 degrees Fahrenheit, which is within the acceptable range of 15–20 degrees F.</p>"
  },

  // --- Section 6: Plumbing System ---
  {
    "Section": "Plumbing System",
    "Item": "Main Water Supply & Shutoff",
    "Comment": "Main Shutoff Valve Located",
    "HTML Text": "<p>The main water supply shutoff valve is located in the basement near the water meter. The ball valve handle operates smoothly with no leaks detected.</p>"
  },
  {
    "Section": "Plumbing System",
    "Item": "Water Heating Equipment",
    "Comment": "50-Gallon Gas Water Heater",
    "HTML Text": "<p>The 50-gallon atmospheric gas water heater is equipped with a functional Temperature & Pressure Relief (TPR) valve and copper discharge tube terminating 6 inches above the floor drain.</p>"
  },
  {
    "Section": "Plumbing System",
    "Item": "Drain, Waste & Vent Systems",
    "Comment": "PVC Drain Piping - Satisfactory",
    "HTML Text": "<p>Drain and waste lines are composed of schedule 40 PVC. Proper slope observed where visible with no signs of active leakage.</p>"
  },

  // --- Section 7: Interiors ---
  {
    "Section": "Interiors",
    "Item": "Walls, Ceilings & Floors",
    "Comment": "Interior Finishes - Good Condition",
    "HTML Text": "<p>Interior drywall surfaces, baseboards, and engineered hardwood flooring are in overall good condition with minor cosmetic blemishes noted in high-traffic hallways.</p>"
  },
  {
    "Section": "Interiors",
    "Item": "Doors & Windows",
    "Comment": "Double-Hung Windows Operational",
    "HTML Text": "<p>A representative number of windows and doors were opened, closed, and latched. All inspected sash balances and lock mechanisms operate properly.</p>"
  },
  {
    "Section": "Interiors",
    "Item": "Smoke & CO Detectors",
    "Comment": "Smoke Alarms Present & Tested",
    "HTML Text": "<p>Hardwired interconnected smoke alarms with battery backup were tested and sounded alarms as designed. Replacement date on alarms is within the recommended 10-year manufacturer lifecycle.</p>"
  },

  // --- Row with unsupported HTML tag to test preservation & issue tracking ---
  {
    "Section": "Interiors",
    "Item": "Fireplaces",
    "Comment": "Gas Log Fireplace Remote Sensor",
    "HTML Text": "<p>Gas fireplace ignited properly via wall switch. <style>.custom-fireplace { color: red; }</p> Note: Chimney damper opens and closes freely.</style>"
  },

  // --- Unmapped / Metadata Row to test unrecognized content handling ---
  {
    "Section": "TEMPLATE_METADATA_HEADER",
    "Item": "",
    "Comment": "Spectora Export Version 4.2 - InterNACHI Certified Residential Template",
    "HTML Text": "Spectora Export Version 4.2 - InterNACHI Certified Residential Template"
  }
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Spectora Template");

const filePath = path.join(fixtureDir, "InterNACHI-Residential-HTML-Text.xlsx");
XLSX.writeFile(wb, filePath);
console.log(`Generated fixture at ${filePath}`);
