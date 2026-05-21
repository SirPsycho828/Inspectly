import * as admin from 'firebase-admin';

// Uses Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Template data
// ---------------------------------------------------------------------------

const STANDARD_RESIDENTIAL = {
  name: 'Standard Residential',
  ownerId: 'system' as const,
  firmId: null,
  isDefault: true,
  sections: [
    {
      id: 'ext-front',
      title: 'Exterior - Front',
      items: [
        { id: 'ext-front-001', label: 'Siding/Cladding', component: 'Siding', description: 'Inspect all visible siding materials for damage, deterioration, or improper installation.' },
        { id: 'ext-front-002', label: 'Foundation (Visible)', component: 'Foundation', description: 'Inspect exposed foundation for cracks, efflorescence, or signs of movement.' },
        { id: 'ext-front-003', label: 'Windows', component: 'Windows', description: 'Inspect window frames, glazing, seals, and operation from exterior.' },
        { id: 'ext-front-004', label: 'Entry Door', component: 'Doors', description: 'Inspect door, frame, threshold, weatherstripping, and hardware.' },
        { id: 'ext-front-005', label: 'Porch/Steps', component: 'Porch', description: 'Inspect porch surface, steps, and connections to structure for safety and deterioration.' },
        { id: 'ext-front-006', label: 'Railings', component: 'Railings', description: 'Inspect railings for structural integrity, height, and spacing compliance.' },
        { id: 'ext-front-007', label: 'Trim/Fascia', component: 'Trim', description: 'Inspect trim boards and fascia for rot, damage, and paint condition.' },
        { id: 'ext-front-008', label: 'Soffit', component: 'Soffit', description: 'Inspect soffit panels for damage, staining, or missing sections.' },
        { id: 'ext-front-009', label: 'Gutters/Downspouts', component: 'Gutters', description: 'Inspect gutters and downspouts for proper slope, attachment, and discharge location.' },
        { id: 'ext-front-010', label: 'Grading/Drainage', component: 'Grading', description: 'Assess grade slope away from foundation; look for signs of ponding.' },
        { id: 'ext-front-011', label: 'Driveway/Walkways', component: 'Flatwork', description: 'Inspect paved surfaces for cracking, heaving, or trip hazards.' },
        { id: 'ext-front-012', label: 'Exterior Lighting', component: 'Electrical', description: 'Test exterior light fixtures for operation.' },
      ],
    },
    {
      id: 'ext-rear',
      title: 'Exterior - Rear/Sides',
      items: [
        { id: 'ext-rear-001', label: 'Siding/Cladding', component: 'Siding', description: 'Inspect all visible siding materials for damage, deterioration, or improper installation.' },
        { id: 'ext-rear-002', label: 'Foundation (Visible)', component: 'Foundation', description: 'Inspect exposed foundation for cracks, efflorescence, or signs of movement.' },
        { id: 'ext-rear-003', label: 'Windows', component: 'Windows', description: 'Inspect window frames, glazing, seals, and operation from exterior.' },
        { id: 'ext-rear-004', label: 'Doors', component: 'Doors', description: 'Inspect rear and side doors, frames, weatherstripping, and hardware.' },
        { id: 'ext-rear-005', label: 'Deck/Patio', component: 'Deck', description: 'Inspect deck framing, decking surface, ledger attachment, and hardware for deterioration or safety hazards.' },
        { id: 'ext-rear-006', label: 'Railings', component: 'Railings', description: 'Inspect deck/patio railings for structural integrity, height, and baluster spacing.' },
        { id: 'ext-rear-007', label: 'Fencing', component: 'Fencing', description: 'Inspect fencing for damage, stability, and gate operation.' },
        { id: 'ext-rear-008', label: 'Retaining Walls', component: 'Retaining Walls', description: 'Inspect retaining walls for movement, cracking, or drainage issues.' },
        { id: 'ext-rear-009', label: 'Vegetation/Trees', component: 'Vegetation', description: 'Note overhanging branches, vegetation contact with structure, or roots near foundation.' },
        { id: 'ext-rear-010', label: 'Drainage', component: 'Drainage', description: 'Assess rear and side yard drainage patterns and downspout discharge.' },
      ],
    },
    {
      id: 'roof',
      title: 'Roof',
      items: [
        { id: 'roof-001', label: 'Roof Covering', component: 'Roofing', description: 'Inspect roofing material condition, age indicators, damage, and remaining useful life.' },
        { id: 'roof-002', label: 'Flashings', component: 'Flashings', description: 'Inspect all roof flashings at penetrations, walls, and transitions for proper installation and sealing.' },
        { id: 'roof-003', label: 'Skylights', component: 'Skylights', description: 'Inspect skylight frames, glazing, and curb flashings for leaks or damage.' },
        { id: 'roof-004', label: 'Chimneys', component: 'Chimney', description: 'Inspect chimney masonry, cap, crown, and flashing from roof level.' },
        { id: 'roof-005', label: 'Vent Pipes', component: 'Plumbing Vents', description: 'Inspect plumbing vent stacks and boot flashings for condition and sealing.' },
        { id: 'roof-006', label: 'Ridge/Hip', component: 'Roofing', description: 'Inspect ridge and hip cap shingles for lifting, cracking, or missing sections.' },
        { id: 'roof-007', label: 'Valleys', component: 'Roofing', description: 'Inspect valley flashing and shingles for wear, damage, or debris accumulation.' },
        { id: 'roof-008', label: 'Eaves/Soffits', component: 'Soffit', description: 'Inspect eaves and soffits for staining, damage, or blocked vents.' },
        { id: 'roof-009', label: 'Gutters', component: 'Gutters', description: 'Inspect gutters from roof level for debris, sagging, or damage.' },
        { id: 'roof-010', label: 'Satellite/Antenna Mounts', component: 'Roof Penetrations', description: 'Inspect satellite dish and antenna mount flashings for leaks.' },
      ],
    },
    {
      id: 'garage',
      title: 'Garage',
      items: [
        { id: 'garage-001', label: 'Garage Door', component: 'Garage Door', description: 'Inspect garage door panels, tracks, springs, and hardware for condition and operation.' },
        { id: 'garage-002', label: 'Auto-Opener', component: 'Garage Door Opener', description: 'Test garage door opener for operation, including wall button and remote.' },
        { id: 'garage-003', label: 'Safety Auto-Reverse', component: 'Garage Door Opener', description: 'Test auto-reverse mechanism with obstruction test per safety requirements.' },
        { id: 'garage-004', label: 'Door to Interior', component: 'Doors', description: 'Inspect fire-rated door between garage and living space for proper rating, self-closing, and sealing.' },
        { id: 'garage-005', label: 'Floor/Foundation', component: 'Foundation', description: 'Inspect garage floor slab and visible foundation for cracks or deterioration.' },
        { id: 'garage-006', label: 'Walls/Ceiling', component: 'Structure', description: 'Inspect garage walls and ceiling for damage, staining, or structural concerns.' },
        { id: 'garage-007', label: 'Electrical', component: 'Electrical', description: 'Inspect garage outlets (GFCI required), lighting, and panel sub-feed if present.' },
        { id: 'garage-008', label: 'Fire Separation', component: 'Fire Safety', description: 'Verify proper fire separation between garage and living areas (drywall, no penetrations).' },
      ],
    },
    {
      id: 'kitchen',
      title: 'Kitchen',
      items: [
        { id: 'kitchen-001', label: 'Countertops', component: 'Countertops', description: 'Inspect countertop surfaces for cracks, damage, and secure attachment.' },
        { id: 'kitchen-002', label: 'Cabinets', component: 'Cabinets', description: 'Inspect cabinet doors, drawers, hardware, and interior for damage or moisture.' },
        { id: 'kitchen-003', label: 'Sink/Faucet', component: 'Plumbing', description: 'Test sink operation, inspect for leaks under sink, and check faucet condition.' },
        { id: 'kitchen-004', label: 'Dishwasher', component: 'Appliances', description: 'Run dishwasher cycle; inspect for leaks and proper door operation.' },
        { id: 'kitchen-005', label: 'Range/Oven', component: 'Appliances', description: 'Test range burners and oven operation; inspect for damage and proper installation.' },
        { id: 'kitchen-006', label: 'Microwave/Hood', component: 'Appliances', description: 'Test microwave/range hood operation including exhaust fan and lighting.' },
        { id: 'kitchen-007', label: 'Refrigerator (if present)', component: 'Appliances', description: 'Note refrigerator presence; basic operational check if included in sale.' },
        { id: 'kitchen-008', label: 'Garbage Disposal', component: 'Plumbing', description: 'Test disposal operation and inspect for leaks.' },
        { id: 'kitchen-009', label: 'GFCI Outlets', component: 'Electrical', description: 'Test all kitchen GFCI outlets within 6 feet of sink for proper protection.' },
        { id: 'kitchen-010', label: 'Flooring', component: 'Flooring', description: 'Inspect kitchen flooring for damage, soft spots, or deterioration.' },
        { id: 'kitchen-011', label: 'Walls/Ceiling', component: 'Interior', description: 'Inspect walls and ceiling for staining, cracking, or evidence of moisture.' },
        { id: 'kitchen-012', label: 'Lighting', component: 'Electrical', description: 'Test all kitchen lighting fixtures for proper operation.' },
      ],
    },
    {
      id: 'bathrooms',
      title: 'Bathrooms',
      items: [
        { id: 'bath-001', label: 'Sink/Faucet', component: 'Plumbing', description: 'Test sink operation, inspect for leaks under vanity, and check faucet condition.' },
        { id: 'bath-002', label: 'Toilet', component: 'Plumbing', description: 'Test flush operation, inspect for leaks at base and supply line, check tank components.' },
        { id: 'bath-003', label: 'Tub/Shower', component: 'Plumbing', description: 'Test tub and shower operation, inspect drain, and check for leaks.' },
        { id: 'bath-004', label: 'Enclosure/Surround', component: 'Tile/Surround', description: 'Inspect tile, surround panels, and enclosure doors for damage or water intrusion.' },
        { id: 'bath-005', label: 'Exhaust Fan', component: 'Ventilation', description: 'Test exhaust fan operation and verify proper exterior termination.' },
        { id: 'bath-006', label: 'GFCI Outlets', component: 'Electrical', description: 'Test all bathroom GFCI outlets for proper protection.' },
        { id: 'bath-007', label: 'Flooring', component: 'Flooring', description: 'Inspect bathroom flooring for soft spots, damage, or loose tile indicating moisture damage.' },
        { id: 'bath-008', label: 'Walls/Ceiling', component: 'Interior', description: 'Inspect walls and ceiling for staining, mold, peeling paint, or evidence of moisture.' },
        { id: 'bath-009', label: 'Caulking/Grout', component: 'Caulking', description: 'Inspect caulking at tub/shower perimeter and grout condition for gaps or deterioration.' },
        { id: 'bath-010', label: 'Water Pressure', component: 'Plumbing', description: 'Test hot and cold water pressure at fixtures.' },
      ],
    },
    {
      id: 'interior-rooms',
      title: 'Interior Rooms',
      items: [
        { id: 'int-001', label: 'Walls/Ceilings', component: 'Interior', description: 'Inspect all walls and ceilings for cracks, staining, bulging, or other defects.' },
        { id: 'int-002', label: 'Flooring', component: 'Flooring', description: 'Inspect flooring throughout for damage, soft spots, squeaking, or trip hazards.' },
        { id: 'int-003', label: 'Windows', component: 'Windows', description: 'Test window operation, inspect locks, and check seals for fogging or condensation.' },
        { id: 'int-004', label: 'Doors', component: 'Doors', description: 'Test interior door operation, latch function, and inspect frames for damage.' },
        { id: 'int-005', label: 'Closets', component: 'Interior', description: 'Inspect closets for staining, damage, or evidence of moisture.' },
        { id: 'int-006', label: 'Electrical Outlets', component: 'Electrical', description: 'Sample test electrical outlets throughout habitable rooms for operation and polarity.' },
        { id: 'int-007', label: 'Light Switches', component: 'Electrical', description: 'Test light switches throughout for proper operation.' },
        { id: 'int-008', label: 'Ceiling Fans', component: 'Electrical', description: 'Test ceiling fan operation on all speeds; inspect mounting for stability.' },
        { id: 'int-009', label: 'Smoke Detectors', component: 'Life Safety', description: 'Verify smoke detector presence and test operation per code locations.' },
        { id: 'int-010', label: 'CO Detectors', component: 'Life Safety', description: 'Verify CO detector presence near sleeping areas and on each level.' },
      ],
    },
    {
      id: 'electrical',
      title: 'Electrical',
      items: [
        { id: 'elec-001', label: 'Service Entrance', component: 'Electrical Service', description: 'Inspect service entrance conductors, weather head, and drip loop from ground level.' },
        { id: 'elec-002', label: 'Main Panel', component: 'Electrical Panel', description: 'Inspect main electrical panel for condition, capacity, double-taps, and safety concerns.' },
        { id: 'elec-003', label: 'Panel Labeling', component: 'Electrical Panel', description: 'Verify breaker circuits are clearly labeled and directory is present.' },
        { id: 'elec-004', label: 'Breakers/Fuses', component: 'Electrical Panel', description: 'Inspect breakers for proper rating, signs of heat damage, or recalled brands.' },
        { id: 'elec-005', label: 'Grounding/Bonding', component: 'Electrical', description: 'Verify grounding electrode and bonding conductors are present and properly connected.' },
        { id: 'elec-006', label: 'Branch Wiring', component: 'Electrical', description: 'Inspect visible wiring for proper support, connections, and absence of hazardous conditions.' },
        { id: 'elec-007', label: 'GFCI Protection', component: 'Electrical', description: 'Verify GFCI protection in all required locations (kitchens, baths, garages, outdoors, etc.).' },
        { id: 'elec-008', label: 'AFCI Protection', component: 'Electrical', description: 'Verify AFCI protection in required bedroom and living area circuits per current code.' },
        { id: 'elec-009', label: 'Outlets (Sampling)', component: 'Electrical', description: 'Test a representative sample of outlets for proper wiring and operation.' },
        { id: 'elec-010', label: 'Switches', component: 'Electrical', description: 'Test a representative sample of switches for proper operation.' },
        { id: 'elec-011', label: 'Light Fixtures', component: 'Electrical', description: 'Test accessible light fixtures for operation; inspect for secure mounting.' },
        { id: 'elec-012', label: 'Smoke/CO Detectors', component: 'Life Safety', description: 'Test smoke and CO detectors for operation; verify locations meet minimum requirements.' },
      ],
    },
    {
      id: 'plumbing',
      title: 'Plumbing',
      items: [
        { id: 'plumb-001', label: 'Water Supply Lines', component: 'Plumbing', description: 'Inspect visible supply lines for material type, condition, and signs of leaks or corrosion.' },
        { id: 'plumb-002', label: 'Drain/Waste/Vent', component: 'Plumbing', description: 'Inspect visible drain, waste, and vent piping for condition and proper support.' },
        { id: 'plumb-003', label: 'Water Heater', component: 'Water Heater', description: 'Inspect water heater for age, capacity, condition, and proper installation.' },
        { id: 'plumb-004', label: 'Temperature/Pressure Relief Valve', component: 'Water Heater', description: 'Inspect T&P relief valve and discharge pipe for proper installation and absence of evidence of past activation.' },
        { id: 'plumb-005', label: 'Supply Shutoffs', component: 'Plumbing', description: 'Locate and verify operation of main water shutoff and fixture shutoffs.' },
        { id: 'plumb-006', label: 'Hose Bibs', component: 'Plumbing', description: 'Test exterior hose bibs for operation and verify freeze-protection type in cold climates.' },
        { id: 'plumb-007', label: 'Sump Pump', component: 'Sump Pump', description: 'Test sump pump operation by pouring water in pit; inspect discharge line termination.' },
        { id: 'plumb-008', label: 'Water Pressure', component: 'Plumbing', description: 'Measure static water pressure; note if below 40 PSI or above 80 PSI.' },
        { id: 'plumb-009', label: 'Visible Leaks', component: 'Plumbing', description: 'Inspect all accessible plumbing for active or past leaks.' },
        { id: 'plumb-010', label: 'Sewage Ejector', component: 'Plumbing', description: 'Inspect sewage ejector pump condition and operation if present.' },
      ],
    },
    {
      id: 'hvac',
      title: 'HVAC',
      items: [
        { id: 'hvac-001', label: 'Heating System Type', component: 'HVAC', description: 'Identify and document heating system type, fuel source, and approximate age.' },
        { id: 'hvac-002', label: 'Furnace/Boiler', component: 'Heating', description: 'Inspect furnace or boiler for condition, operation, and visible defects.' },
        { id: 'hvac-003', label: 'Heat Exchanger', component: 'Heating', description: 'Inspect accessible heat exchanger surfaces for cracks or corrosion (visual inspection).' },
        { id: 'hvac-004', label: 'Burner/Ignition', component: 'Heating', description: 'Observe burner flame pattern and ignition operation for proper function.' },
        { id: 'hvac-005', label: 'Flue/Vent', component: 'Heating', description: 'Inspect flue/vent pipes for proper pitch, joints, and absence of obstructions.' },
        { id: 'hvac-006', label: 'Thermostat', component: 'HVAC Controls', description: 'Test thermostat for heating and cooling operation.' },
        { id: 'hvac-007', label: 'Distribution (Ducts/Piping)', component: 'HVAC', description: 'Inspect accessible ductwork or hydronic piping for condition, insulation, and connections.' },
        { id: 'hvac-008', label: 'Cooling System', component: 'Cooling', description: 'Identify cooling system type and verify operation (temperature permitting).' },
        { id: 'hvac-009', label: 'Condenser Unit', component: 'Cooling', description: 'Inspect outdoor condenser unit for condition, clearances, and electrical disconnect.' },
        { id: 'hvac-010', label: 'Refrigerant Lines', component: 'Cooling', description: 'Inspect refrigerant line insulation and connections for condition.' },
        { id: 'hvac-011', label: 'Air Filter', component: 'HVAC', description: 'Inspect air filter condition and note replacement interval recommendation.' },
        { id: 'hvac-012', label: 'Condensate Drain', component: 'HVAC', description: 'Inspect condensate drain pan and drain line for blockage or overflow evidence.' },
      ],
    },
    {
      id: 'attic',
      title: 'Attic',
      items: [
        { id: 'attic-001', label: 'Access/Entry', component: 'Attic', description: 'Inspect attic access hatch or door for insulation and weatherstripping.' },
        { id: 'attic-002', label: 'Insulation', component: 'Insulation', description: 'Inspect insulation depth, type, and coverage; note areas of deficiency.' },
        { id: 'attic-003', label: 'Ventilation', component: 'Ventilation', description: 'Assess attic ventilation adequacy including intake (soffit) and exhaust (ridge/roof) vents.' },
        { id: 'attic-004', label: 'Framing/Structure', component: 'Structure', description: 'Inspect roof framing members for damage, sagging, or repairs.' },
        { id: 'attic-005', label: 'Moisture/Staining', component: 'Moisture', description: 'Look for staining, mold, or evidence of active or past moisture intrusion.' },
        { id: 'attic-006', label: 'Electrical', component: 'Electrical', description: 'Inspect visible electrical wiring and junction boxes in attic for safety.' },
        { id: 'attic-007', label: 'Bathroom Exhaust Termination', component: 'Ventilation', description: 'Verify bathroom exhaust fans terminate to exterior, not into attic space.' },
        { id: 'attic-008', label: 'Roof Sheathing', component: 'Roofing', description: 'Inspect underside of roof sheathing for staining, delamination, or damage.' },
      ],
    },
    {
      id: 'basement',
      title: 'Basement/Crawlspace',
      items: [
        { id: 'bsmt-001', label: 'Foundation Walls', component: 'Foundation', description: 'Inspect foundation walls for cracks, bowing, efflorescence, or water staining.' },
        { id: 'bsmt-002', label: 'Floor/Slab', component: 'Foundation', description: 'Inspect basement floor or crawlspace slab for cracks, heaving, or moisture.' },
        { id: 'bsmt-003', label: 'Moisture/Water Intrusion', component: 'Moisture', description: 'Look for active leaks, staining, efflorescence, or evidence of past water intrusion.' },
        { id: 'bsmt-004', label: 'Structural Components', component: 'Structure', description: 'Inspect all visible structural framing members for damage, decay, or insect activity.' },
        { id: 'bsmt-005', label: 'Columns/Posts', component: 'Structure', description: 'Inspect support columns and posts for proper bearing, plumb, and condition.' },
        { id: 'bsmt-006', label: 'Beams/Joists', component: 'Structure', description: 'Inspect main beams and floor joists for deflection, damage, notching, or repairs.' },
        { id: 'bsmt-007', label: 'Insulation', component: 'Insulation', description: 'Inspect basement/crawlspace insulation for coverage, proper installation, and condition.' },
        { id: 'bsmt-008', label: 'Vapor Barrier', component: 'Moisture', description: 'Inspect crawlspace vapor barrier for coverage, condition, and lap joints.' },
        { id: 'bsmt-009', label: 'Sump Pit', component: 'Drainage', description: 'Inspect sump pit for water level and condition; note presence of lid.' },
        { id: 'bsmt-010', label: 'Radon Mitigation', component: 'Radon', description: 'Note presence or absence of radon mitigation system; recommend testing if not present.' },
      ],
    },
    {
      id: 'fireplace',
      title: 'Fireplace/Chimney',
      items: [
        { id: 'fp-001', label: 'Firebox', component: 'Fireplace', description: 'Inspect firebox for cracks in masonry, damaged firebrick, or deteriorated mortar joints.' },
        { id: 'fp-002', label: 'Damper', component: 'Fireplace', description: 'Test damper for operation and verify it seals properly when closed.' },
        { id: 'fp-003', label: 'Hearth Extension', component: 'Fireplace', description: 'Inspect hearth extension for required depth and non-combustible materials.' },
        { id: 'fp-004', label: 'Mantel Clearance', component: 'Fireplace', description: 'Verify mantel and combustible materials maintain code-required clearances from firebox opening.' },
        { id: 'fp-005', label: 'Gas Valve/Key', component: 'Gas', description: 'Locate gas shutoff valve and verify key is present for gas fireplace or log lighter.' },
        { id: 'fp-006', label: 'Chimney Cap', component: 'Chimney', description: 'Inspect chimney cap condition from ground level; note absence if not visible.' },
      ],
    },
    {
      id: 'laundry',
      title: 'Laundry',
      items: [
        { id: 'laund-001', label: 'Washer Connections', component: 'Plumbing', description: 'Inspect washer hot/cold supply hoses and drain for condition and leaks.' },
        { id: 'laund-002', label: 'Dryer Vent', component: 'Ventilation', description: 'Inspect dryer vent duct material, routing, and exterior termination for proper installation.' },
        { id: 'laund-003', label: 'Dryer Connection', component: 'Electrical/Gas', description: 'Verify proper 240V outlet (electric) or gas supply and shutoff (gas) for dryer.' },
        { id: 'laund-004', label: 'GFCI Outlet', component: 'Electrical', description: 'Verify GFCI protection for outlets in laundry area per current code.' },
        { id: 'laund-005', label: 'Floor/Drain', component: 'Plumbing', description: 'Inspect laundry floor for damage or moisture; verify floor drain is present and accessible.' },
        { id: 'laund-006', label: 'Utility Sink', component: 'Plumbing', description: 'Test utility sink faucet and inspect for leaks if present.' },
      ],
    },
    {
      id: 'site-grounds',
      title: 'Site/Grounds',
      items: [
        { id: 'site-001', label: 'Grading', component: 'Grading', description: 'Verify positive grade slopes away from foundation on all sides.' },
        { id: 'site-002', label: 'Drainage Patterns', component: 'Drainage', description: 'Assess overall site drainage patterns and identify areas prone to ponding.' },
        { id: 'site-003', label: 'Retaining Walls', component: 'Retaining Walls', description: 'Inspect retaining walls for movement, cracking, missing cap stones, or drainage issues.' },
        { id: 'site-004', label: 'Walkways/Steps', component: 'Flatwork', description: 'Inspect all walkways and steps for cracking, heaving, or trip hazards.' },
        { id: 'site-005', label: 'Handrails', component: 'Railings', description: 'Verify handrails are present and secure where steps exceed code thresholds.' },
        { id: 'site-006', label: 'Exterior Outlets', component: 'Electrical', description: 'Test exterior outlets for operation and GFCI protection; verify weatherproof covers.' },
        { id: 'site-007', label: 'Sprinkler System', component: 'Irrigation', description: 'Note presence of irrigation system; basic operation test if season permits.' },
        { id: 'site-008', label: 'Address Visible', component: 'Safety', description: 'Verify house number is clearly visible from street for emergency response.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const CONDO_TOWNHOUSE = {
  name: 'Condo/Townhouse',
  ownerId: 'system' as const,
  firmId: null,
  isDefault: false,
  sections: [
    {
      id: 'ct-building-ext',
      title: 'Building Exterior (Visible)',
      items: [
        { id: 'ct-bext-001', label: 'Siding/Cladding (Visible)', component: 'Siding', description: 'Inspect all visible siding materials on the unit exterior for damage or deterioration (note: common areas are HOA responsibility).' },
        { id: 'ct-bext-002', label: 'Windows (Exterior)', component: 'Windows', description: 'Inspect window frames and glazing from exterior where accessible.' },
        { id: 'ct-bext-003', label: 'Entry Door', component: 'Doors', description: 'Inspect entry door, frame, threshold, weatherstripping, and hardware.' },
        { id: 'ct-bext-004', label: 'Foundation (Visible)', component: 'Foundation', description: 'Inspect any exposed foundation visible at unit level.' },
        { id: 'ct-bext-005', label: 'Exterior Lighting', component: 'Electrical', description: 'Test exterior light fixtures assigned to unit for operation.' },
        { id: 'ct-bext-006', label: 'Trim/Fascia (Visible)', component: 'Trim', description: 'Inspect visible trim and fascia associated with unit for damage.' },
        { id: 'ct-bext-007', label: 'Common Areas Noted', component: 'Common Areas', description: 'Note any visible common area deficiencies for buyer awareness (not formally inspected — HOA responsibility).' },
      ],
    },
    {
      id: 'ct-balcony',
      title: 'Balcony/Terrace',
      items: [
        { id: 'ct-bal-001', label: 'Deck/Balcony Surface', component: 'Balcony', description: 'Inspect balcony or terrace surface for cracks, damage, or drainage issues.' },
        { id: 'ct-bal-002', label: 'Railings', component: 'Railings', description: 'Inspect balcony railings for structural integrity, height, and baluster spacing.' },
        { id: 'ct-bal-003', label: 'Sliding/French Door', component: 'Doors', description: 'Inspect balcony door, tracks, weatherstripping, and locking hardware.' },
        { id: 'ct-bal-004', label: 'Drainage/Scuppers', component: 'Drainage', description: 'Verify balcony slopes to drain and scuppers or drains are clear.' },
        { id: 'ct-bal-005', label: 'Structural Connections (Visible)', component: 'Structure', description: 'Inspect visible balcony-to-building connections for signs of deterioration or separation.' },
        { id: 'ct-bal-006', label: 'Exterior Outlet', component: 'Electrical', description: 'Test balcony outlet for operation and GFCI protection if present.' },
      ],
    },
    {
      id: 'ct-garage',
      title: 'Garage/Parking',
      items: [
        { id: 'ct-gar-001', label: 'Garage Door (if private)', component: 'Garage Door', description: 'Inspect garage door panels, tracks, and hardware for condition and operation.' },
        { id: 'ct-gar-002', label: 'Auto-Opener', component: 'Garage Door Opener', description: 'Test garage door opener operation and remote function.' },
        { id: 'ct-gar-003', label: 'Safety Auto-Reverse', component: 'Garage Door Opener', description: 'Test auto-reverse mechanism with obstruction test.' },
        { id: 'ct-gar-004', label: 'Floor/Foundation', component: 'Foundation', description: 'Inspect private garage floor for cracks or deterioration.' },
        { id: 'ct-gar-005', label: 'Electrical', component: 'Electrical', description: 'Inspect garage outlets (GFCI required) and lighting.' },
        { id: 'ct-gar-006', label: 'Fire Separation', component: 'Fire Safety', description: 'Verify proper fire separation between private garage and living areas.' },
      ],
    },
    {
      id: 'ct-kitchen',
      title: 'Kitchen',
      items: [
        { id: 'ct-kit-001', label: 'Countertops', component: 'Countertops', description: 'Inspect countertop surfaces for cracks, damage, and secure attachment.' },
        { id: 'ct-kit-002', label: 'Cabinets', component: 'Cabinets', description: 'Inspect cabinet doors, drawers, hardware, and interior for damage or moisture.' },
        { id: 'ct-kit-003', label: 'Sink/Faucet', component: 'Plumbing', description: 'Test sink operation, inspect for leaks under sink, and check faucet condition.' },
        { id: 'ct-kit-004', label: 'Dishwasher', component: 'Appliances', description: 'Run dishwasher cycle; inspect for leaks and proper door operation.' },
        { id: 'ct-kit-005', label: 'Range/Oven', component: 'Appliances', description: 'Test range burners and oven operation; inspect for damage.' },
        { id: 'ct-kit-006', label: 'Microwave/Hood', component: 'Appliances', description: 'Test microwave/range hood operation including exhaust fan and lighting.' },
        { id: 'ct-kit-007', label: 'Garbage Disposal', component: 'Plumbing', description: 'Test disposal operation and inspect for leaks.' },
        { id: 'ct-kit-008', label: 'GFCI Outlets', component: 'Electrical', description: 'Test all kitchen GFCI outlets within 6 feet of sink.' },
        { id: 'ct-kit-009', label: 'Flooring', component: 'Flooring', description: 'Inspect kitchen flooring for damage or deterioration.' },
        { id: 'ct-kit-010', label: 'Walls/Ceiling', component: 'Interior', description: 'Inspect walls and ceiling for staining or evidence of moisture.' },
        { id: 'ct-kit-011', label: 'Lighting', component: 'Electrical', description: 'Test all kitchen lighting fixtures for operation.' },
      ],
    },
    {
      id: 'ct-bathrooms',
      title: 'Bathrooms',
      items: [
        { id: 'ct-bath-001', label: 'Sink/Faucet', component: 'Plumbing', description: 'Test sink operation, inspect for leaks under vanity, and check faucet condition.' },
        { id: 'ct-bath-002', label: 'Toilet', component: 'Plumbing', description: 'Test flush operation, inspect for leaks at base and supply line.' },
        { id: 'ct-bath-003', label: 'Tub/Shower', component: 'Plumbing', description: 'Test tub and shower operation; inspect drain and check for leaks.' },
        { id: 'ct-bath-004', label: 'Enclosure/Surround', component: 'Tile/Surround', description: 'Inspect tile, surround panels, and enclosure doors for damage or water intrusion.' },
        { id: 'ct-bath-005', label: 'Exhaust Fan', component: 'Ventilation', description: 'Test exhaust fan operation and verify proper exterior termination.' },
        { id: 'ct-bath-006', label: 'GFCI Outlets', component: 'Electrical', description: 'Test all bathroom GFCI outlets for proper protection.' },
        { id: 'ct-bath-007', label: 'Flooring', component: 'Flooring', description: 'Inspect flooring for soft spots or damage indicating moisture.' },
        { id: 'ct-bath-008', label: 'Walls/Ceiling', component: 'Interior', description: 'Inspect walls and ceiling for staining, mold, or evidence of moisture.' },
        { id: 'ct-bath-009', label: 'Caulking/Grout', component: 'Caulking', description: 'Inspect caulking at tub/shower perimeter and grout condition.' },
        { id: 'ct-bath-010', label: 'Water Pressure', component: 'Plumbing', description: 'Test hot and cold water pressure at fixtures.' },
      ],
    },
    {
      id: 'ct-interior-rooms',
      title: 'Interior Rooms',
      items: [
        { id: 'ct-int-001', label: 'Walls/Ceilings', component: 'Interior', description: 'Inspect all walls and ceilings for cracks, staining, or other defects; note party wall condition.' },
        { id: 'ct-int-002', label: 'Flooring', component: 'Flooring', description: 'Inspect flooring throughout for damage, soft spots, or trip hazards.' },
        { id: 'ct-int-003', label: 'Windows', component: 'Windows', description: 'Test window operation, inspect locks, and check seals for fogging.' },
        { id: 'ct-int-004', label: 'Doors', component: 'Doors', description: 'Test interior door operation, latch function, and inspect frames.' },
        { id: 'ct-int-005', label: 'Electrical Outlets', component: 'Electrical', description: 'Sample test electrical outlets for operation and polarity.' },
        { id: 'ct-int-006', label: 'Light Switches', component: 'Electrical', description: 'Test light switches throughout for proper operation.' },
        { id: 'ct-int-007', label: 'Ceiling Fans', component: 'Electrical', description: 'Test ceiling fan operation; inspect mounting for stability.' },
        { id: 'ct-int-008', label: 'Smoke Detectors', component: 'Life Safety', description: 'Verify smoke detector presence and test operation.' },
        { id: 'ct-int-009', label: 'CO Detectors', component: 'Life Safety', description: 'Verify CO detector presence near sleeping areas and on each level.' },
        { id: 'ct-int-010', label: 'Sound Attenuation (Note)', component: 'Party Walls', description: 'Note any evidence of inadequate sound attenuation through party walls or floors/ceilings.' },
      ],
    },
    {
      id: 'ct-electrical',
      title: 'Electrical',
      items: [
        { id: 'ct-elec-001', label: 'Unit Panel/Sub-Panel', component: 'Electrical Panel', description: 'Inspect unit electrical panel for condition, capacity, double-taps, and labeling.' },
        { id: 'ct-elec-002', label: 'Panel Labeling', component: 'Electrical Panel', description: 'Verify breaker circuits are labeled and directory is present.' },
        { id: 'ct-elec-003', label: 'Breakers', component: 'Electrical Panel', description: 'Inspect breakers for proper rating and signs of heat damage.' },
        { id: 'ct-elec-004', label: 'GFCI Protection', component: 'Electrical', description: 'Verify GFCI protection in all required locations.' },
        { id: 'ct-elec-005', label: 'AFCI Protection', component: 'Electrical', description: 'Verify AFCI protection in required circuits per current code.' },
        { id: 'ct-elec-006', label: 'Outlets (Sampling)', component: 'Electrical', description: 'Test a representative sample of outlets for operation and polarity.' },
        { id: 'ct-elec-007', label: 'Light Fixtures', component: 'Electrical', description: 'Test accessible light fixtures for operation.' },
        { id: 'ct-elec-008', label: 'Smoke/CO Detectors', component: 'Life Safety', description: 'Test smoke and CO detectors for operation.' },
      ],
    },
    {
      id: 'ct-plumbing',
      title: 'Plumbing',
      items: [
        { id: 'ct-plumb-001', label: 'Water Supply Lines (Visible)', component: 'Plumbing', description: 'Inspect visible supply lines for material type, condition, and signs of leaks.' },
        { id: 'ct-plumb-002', label: 'Drain/Waste Lines (Visible)', component: 'Plumbing', description: 'Inspect visible drain and waste piping for condition and proper support.' },
        { id: 'ct-plumb-003', label: 'Water Heater', component: 'Water Heater', description: 'Inspect water heater for age, capacity, condition, and proper installation.' },
        { id: 'ct-plumb-004', label: 'T&P Relief Valve', component: 'Water Heater', description: 'Inspect T&P relief valve and discharge pipe for proper installation.' },
        { id: 'ct-plumb-005', label: 'Unit Shutoffs', component: 'Plumbing', description: 'Locate and verify operation of unit main water shutoff and fixture shutoffs.' },
        { id: 'ct-plumb-006', label: 'Water Pressure', component: 'Plumbing', description: 'Measure static water pressure at unit.' },
        { id: 'ct-plumb-007', label: 'Visible Leaks', component: 'Plumbing', description: 'Inspect all accessible plumbing for active or past leaks.' },
        { id: 'ct-plumb-008', label: 'Hose Bib (if present)', component: 'Plumbing', description: 'Test any unit-assigned exterior hose bib for operation.' },
      ],
    },
    {
      id: 'ct-hvac',
      title: 'HVAC',
      items: [
        { id: 'ct-hvac-001', label: 'Heating System Type', component: 'HVAC', description: 'Identify heating system type, fuel source, and approximate age.' },
        { id: 'ct-hvac-002', label: 'Furnace/Air Handler', component: 'Heating', description: 'Inspect furnace or air handler for condition and operation.' },
        { id: 'ct-hvac-003', label: 'Burner/Ignition', component: 'Heating', description: 'Observe burner flame pattern and ignition operation.' },
        { id: 'ct-hvac-004', label: 'Flue/Vent', component: 'Heating', description: 'Inspect flue/vent pipes for proper pitch, joints, and clearances.' },
        { id: 'ct-hvac-005', label: 'Thermostat', component: 'HVAC Controls', description: 'Test thermostat for heating and cooling operation.' },
        { id: 'ct-hvac-006', label: 'Distribution (Ducts)', component: 'HVAC', description: 'Inspect accessible ductwork for condition, connections, and insulation.' },
        { id: 'ct-hvac-007', label: 'Cooling System', component: 'Cooling', description: 'Identify cooling system type and verify operation (temperature permitting).' },
        { id: 'ct-hvac-008', label: 'Condenser/Fan Coil Unit', component: 'Cooling', description: 'Inspect unit condenser or fan coil unit for condition and clearances.' },
        { id: 'ct-hvac-009', label: 'Air Filter', component: 'HVAC', description: 'Inspect air filter condition.' },
        { id: 'ct-hvac-010', label: 'Condensate Drain', component: 'HVAC', description: 'Inspect condensate drain pan and line for blockage or overflow.' },
      ],
    },
    {
      id: 'ct-laundry',
      title: 'Laundry',
      items: [
        { id: 'ct-laund-001', label: 'Washer Connections', component: 'Plumbing', description: 'Inspect washer hot/cold supply hoses and drain for condition and leaks.' },
        { id: 'ct-laund-002', label: 'Dryer Vent', component: 'Ventilation', description: 'Inspect dryer vent duct material, routing, and exterior termination.' },
        { id: 'ct-laund-003', label: 'Dryer Connection', component: 'Electrical/Gas', description: 'Verify proper 240V outlet (electric) or gas supply (gas) for dryer.' },
        { id: 'ct-laund-004', label: 'GFCI Outlet', component: 'Electrical', description: 'Verify GFCI protection for laundry area outlets.' },
        { id: 'ct-laund-005', label: 'Floor/Drain', component: 'Plumbing', description: 'Inspect laundry floor for damage or moisture.' },
        { id: 'ct-laund-006', label: 'Washer Pan/Overflow', component: 'Plumbing', description: 'Verify washing machine pan and drain are present to protect unit below.' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Seeding logic
// ---------------------------------------------------------------------------

async function seedTemplates(): Promise<void> {
  console.log('Checking for existing system templates...');

  const templatesRef = db.collection('checklistTemplates');
  const existing = await templatesRef.where('ownerId', '==', 'system').get();

  if (!existing.empty) {
    console.log(`Found ${existing.size} existing system template(s). Skipping seed.`);
    existing.docs.forEach((doc) => {
      console.log(`  - ${doc.id}: ${doc.data().name}`);
    });
    return;
  }

  console.log('No system templates found. Seeding...');

  const templates = [STANDARD_RESIDENTIAL, CONDO_TOWNHOUSE];
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const template of templates) {
    const docData = {
      ...template,
      createdAt: now,
      updatedAt: now,
    };

    // Count total items to decide if we need multiple batches
    const totalItems = template.sections.reduce((sum, s) => sum + s.items.length, 0);
    console.log(`\nSeeding "${template.name}" (${template.sections.length} sections, ${totalItems} items)...`);

    // Write the template document itself
    const docRef = templatesRef.doc();
    const batch = db.batch();
    batch.set(docRef, docData);
    await batch.commit();

    console.log(`  Created template document: ${docRef.id}`);
  }

  console.log('\nSeed complete.');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

seedTemplates()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
