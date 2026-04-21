/**
 * ORBIT Data Source Translator
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth. Change ONLY this file to swap providers.
 *
 * Reliable sources (verified):
 *   covid19      → disease.sh   (real-time, fully working)
 *   mpox         → WHO GHO      (MPOX_CONF indicator)
 *   influenza    → WHO GHO      (RSUD_Influenza_PercPositive — weekly FluNet)
 *   tuberculosis → WHO GHO      (MDG_0000000020 — TB incidence per 100k)
 *   dengue       → WHO GHO      (DENGUE_CASES — annual reported cases)
 *   cholera      → WHO GHO      (CHOLERA_0000000001 — annual cases)
 *   measles      → WHO GHO      (WHS3_62 — reported measles cases)
 */

// ISO3 → [lat, lng] for WHO GHO data (uses 3-letter codes)
const ISO3_COORDS = {
  AFG:[33.9,67.7],ALB:[41.2,20.2],DZA:[28.0,1.7],AGO:[-11.2,17.9],ARG:[-38.4,-63.6],
  ARM:[40.1,45.0],AUS:[-25.3,133.8],AUT:[47.5,14.6],AZE:[40.1,47.6],BGD:[23.7,90.4],
  BLR:[53.7,28.0],BEL:[50.5,4.5],BEN:[9.3,2.3],BOL:[-16.3,-63.6],BIH:[43.9,17.7],
  BWA:[-22.3,24.7],BRA:[-14.2,-51.9],BGR:[42.7,25.5],BFA:[12.4,-1.6],BDI:[-3.4,29.9],
  KHM:[12.6,105.0],CMR:[3.9,11.5],CAN:[56.1,-106.3],CAF:[6.6,20.9],TCD:[15.5,18.7],
  CHL:[-35.7,-71.5],CHN:[35.9,104.2],COL:[4.6,-74.3],COD:[-4.0,21.8],COG:[-0.2,15.8],
  CRI:[9.7,-83.7],HRV:[45.1,15.2],CUB:[21.5,-77.8],CZE:[49.8,15.5],DNK:[56.3,9.5],
  DJI:[11.8,42.6],DOM:[18.7,-70.2],ECU:[-1.8,-78.2],EGY:[26.8,30.8],SLV:[13.8,-88.9],
  ERI:[15.2,39.8],EST:[58.6,25.0],ETH:[9.1,40.5],FIN:[61.9,25.8],FRA:[46.2,2.2],
  GAB:[-0.8,11.6],GMB:[13.4,-15.3],GEO:[42.3,43.4],DEU:[51.2,10.5],GHA:[8.0,-1.0],
  GRC:[39.1,21.8],GTM:[15.8,-90.2],GIN:[10.0,-11.2],GNB:[11.8,-15.2],HTI:[18.9,-72.3],
  HND:[15.2,-86.2],HUN:[47.2,19.5],IND:[20.6,79.0],IDN:[-0.8,113.9],IRN:[32.4,53.7],
  IRQ:[33.2,43.7],IRL:[53.4,-8.2],ISR:[31.0,34.9],ITA:[41.9,12.6],JAM:[18.1,-77.3],
  JPN:[36.2,138.3],JOR:[30.6,36.2],KAZ:[48.0,66.9],KEN:[-0.0,37.9],KWT:[29.3,47.5],
  KGZ:[41.2,74.8],LAO:[19.9,102.5],LVA:[56.9,24.6],LBN:[33.9,35.9],LSO:[-29.6,28.2],
  LBR:[6.4,-9.4],LBY:[26.3,17.2],LTU:[55.2,23.9],MDG:[-18.8,46.9],MWI:[-13.3,34.3],
  MYS:[4.2,102.0],MLI:[17.6,-4.0],MRT:[21.0,-10.9],MEX:[23.6,-102.6],MDA:[47.4,28.4],
  MNG:[46.9,103.8],MAR:[31.8,-7.1],MOZ:[-18.7,35.5],MMR:[21.9,96.0],NAM:[-23.0,18.5],
  NPL:[28.4,84.1],NLD:[52.1,5.3],NZL:[-40.9,174.9],NIC:[12.9,-85.2],NER:[17.6,8.1],
  NGA:[9.1,8.7],NOR:[60.5,8.5],PAK:[30.4,69.3],PAN:[8.5,-80.8],PRY:[-23.4,-58.4],
  PER:[-9.2,-75.0],PHL:[12.9,121.8],POL:[51.9,19.1],PRT:[39.4,-8.2],ROU:[45.9,25.0],
  RUS:[61.5,105.3],RWA:[-1.9,29.9],SAU:[23.9,45.1],SEN:[14.5,-14.5],SRB:[44.0,21.0],
  SLE:[8.5,-11.8],SOM:[5.2,46.2],ZAF:[-30.6,22.9],SSD:[6.9,31.6],ESP:[40.5,-3.7],
  LKA:[7.9,80.8],SDN:[12.9,30.2],SWZ:[-26.5,31.5],SWE:[60.1,18.6],CHE:[46.8,8.2],
  SYR:[34.8,39.0],TJK:[38.9,71.3],TZA:[-6.4,34.9],THA:[15.9,101.0],TGO:[8.6,0.8],
  TTO:[10.7,-61.2],TUN:[33.9,9.5],TUR:[39.0,35.2],TKM:[39.0,59.6],UGA:[1.4,32.3],
  UKR:[48.4,31.2],ARE:[23.4,53.8],GBR:[55.4,-3.4],USA:[37.1,-95.7],URY:[-32.5,-55.8],
  UZB:[41.4,64.6],VEN:[6.4,-66.6],VNM:[14.1,108.3],YEM:[15.6,48.5],ZMB:[-13.1,27.8],
  ZWE:[-19.0,29.2],
};

// ISO3 → ISO2 mapping for flag lookup
const ISO3_TO_ISO2 = {
  AFG:"AF",ALB:"AL",DZA:"DZ",AGO:"AO",ARG:"AR",ARM:"AM",AUS:"AU",AUT:"AT",AZE:"AZ",
  BGD:"BD",BLR:"BY",BEL:"BE",BEN:"BJ",BOL:"BO",BIH:"BA",BWA:"BW",BRA:"BR",BGR:"BG",
  BFA:"BF",BDI:"BI",KHM:"KH",CMR:"CM",CAN:"CA",CAF:"CF",TCD:"TD",CHL:"CL",CHN:"CN",
  COL:"CO",COD:"CD",COG:"CG",CRI:"CR",HRV:"HR",CUB:"CU",CZE:"CZ",DNK:"DK",DJI:"DJ",
  DOM:"DO",ECU:"EC",EGY:"EG",SLV:"SV",ERI:"ER",EST:"EE",ETH:"ET",FIN:"FI",FRA:"FR",
  GAB:"GA",GMB:"GM",GEO:"GE",DEU:"DE",GHA:"GH",GRC:"GR",GTM:"GT",GIN:"GN",GNB:"GW",
  HTI:"HT",HND:"HN",HUN:"HU",IND:"IN",IDN:"ID",IRN:"IR",IRQ:"IQ",IRL:"IE",ISR:"IL",
  ITA:"IT",JAM:"JM",JPN:"JP",JOR:"JO",KAZ:"KZ",KEN:"KE",KWT:"KW",KGZ:"KG",LAO:"LA",
  LVA:"LV",LBN:"LB",LSO:"LS",LBR:"LR",LBY:"LY",LTU:"LT",MDG:"MG",MWI:"MW",MYS:"MY",
  MLI:"ML",MRT:"MR",MEX:"MX",MDA:"MD",MNG:"MN",MAR:"MA",MOZ:"MZ",MMR:"MM",NAM:"NA",
  NPL:"NP",NLD:"NL",NZL:"NZ",NIC:"NI",NER:"NE",NGA:"NG",NOR:"NO",PAK:"PK",PAN:"PA",
  PRY:"PY",PER:"PE",PHL:"PH",POL:"PL",PRT:"PT",ROU:"RO",RUS:"RU",RWA:"RW",SAU:"SA",
  SEN:"SN",SRB:"RS",SLE:"SL",SOM:"SO",ZAF:"ZA",SSD:"SS",ESP:"ES",LKA:"LK",SDN:"SD",
  SWZ:"SZ",SWE:"SE",CHE:"CH",SYR:"SY",TJK:"TJ",TZA:"TZ",THA:"TH",TGO:"TG",TTO:"TT",
  TUN:"TN",TUR:"TR",TKM:"TM",UGA:"UG",UKR:"UA",ARE:"AE",GBR:"GB",USA:"US",URY:"UY",
  UZB:"UZ",VEN:"VE",VNM:"VN",YEM:"YE",ZMB:"ZM",ZWE:"ZW",
};

// WHO GHO country display name lookup for cleaner names
const ISO3_NAMES = {
  AFG:"Afghanistan",ALB:"Albania",DZA:"Algeria",AGO:"Angola",ARG:"Argentina",
  ARM:"Armenia",AUS:"Australia",AUT:"Austria",AZE:"Azerbaijan",BGD:"Bangladesh",
  BLR:"Belarus",BEL:"Belgium",BEN:"Benin",BOL:"Bolivia",BIH:"Bosnia & Herzegovina",
  BWA:"Botswana",BRA:"Brazil",BGR:"Bulgaria",BFA:"Burkina Faso",BDI:"Burundi",
  KHM:"Cambodia",CMR:"Cameroon",CAN:"Canada",CAF:"Central African Republic",
  TCD:"Chad",CHL:"Chile",CHN:"China",COL:"Colombia",COD:"DR Congo",COG:"Congo",
  CRI:"Costa Rica",HRV:"Croatia",CUB:"Cuba",CZE:"Czech Republic",DNK:"Denmark",
  DJI:"Djibouti",DOM:"Dominican Republic",ECU:"Ecuador",EGY:"Egypt",SLV:"El Salvador",
  ERI:"Eritrea",EST:"Estonia",ETH:"Ethiopia",FIN:"Finland",FRA:"France",GAB:"Gabon",
  GMB:"Gambia",GEO:"Georgia",DEU:"Germany",GHA:"Ghana",GRC:"Greece",GTM:"Guatemala",
  GIN:"Guinea",GNB:"Guinea-Bissau",HTI:"Haiti",HND:"Honduras",HUN:"Hungary",
  IND:"India",IDN:"Indonesia",IRN:"Iran",IRQ:"Iraq",IRL:"Ireland",ISR:"Israel",
  ITA:"Italy",JAM:"Jamaica",JPN:"Japan",JOR:"Jordan",KAZ:"Kazakhstan",KEN:"Kenya",
  KWT:"Kuwait",KGZ:"Kyrgyzstan",LAO:"Laos",LVA:"Latvia",LBN:"Lebanon",LSO:"Lesotho",
  LBR:"Liberia",LBY:"Libya",LTU:"Lithuania",MDG:"Madagascar",MWI:"Malawi",
  MYS:"Malaysia",MLI:"Mali",MRT:"Mauritania",MEX:"Mexico",MDA:"Moldova",
  MNG:"Mongolia",MAR:"Morocco",MOZ:"Mozambique",MMR:"Myanmar",NAM:"Namibia",
  NPL:"Nepal",NLD:"Netherlands",NZL:"New Zealand",NIC:"Nicaragua",NER:"Niger",
  NGA:"Nigeria",NOR:"Norway",PAK:"Pakistan",PAN:"Panama",PRY:"Paraguay",
  PER:"Peru",PHL:"Philippines",POL:"Poland",PRT:"Portugal",ROU:"Romania",
  RUS:"Russia",RWA:"Rwanda",SAU:"Saudi Arabia",SEN:"Senegal",SRB:"Serbia",
  SLE:"Sierra Leone",SOM:"Somalia",ZAF:"South Africa",SSD:"South Sudan",
  ESP:"Spain",LKA:"Sri Lanka",SDN:"Sudan",SWZ:"Eswatini",SWE:"Sweden",
  CHE:"Switzerland",SYR:"Syria",TJK:"Tajikistan",TZA:"Tanzania",THA:"Thailand",
  TGO:"Togo",TTO:"Trinidad & Tobago",TUN:"Tunisia",TUR:"Turkey",TKM:"Turkmenistan",
  UGA:"Uganda",UKR:"Ukraine",ARE:"UAE",GBR:"United Kingdom",USA:"United States",
  URY:"Uruguay",UZB:"Uzbekistan",VEN:"Venezuela",VNM:"Vietnam",YEM:"Yemen",
  ZMB:"Zambia",ZWE:"Zimbabwe",
};

function ghoTransform(raw) {
  const iso3   = (raw.SpatialDim || "XXX").toUpperCase();
  const iso2   = ISO3_TO_ISO2[iso3] || iso3.slice(0,2);
  const coords = ISO3_COORDS[iso3]  || [0, 0];
  const name   = ISO3_NAMES[iso3]   || raw.SpatialDimDisplay || iso3;
  const val    = Math.max(0, Math.round(raw.NumericValue || 0));

  return {
    country:          name,
    countryCode:      iso2,
    lat:              coords[0],
    lng:              coords[1],
    cases:            val,
    deaths:           0,
    recovered:        0,
    active:           val,
    critical:         0,
    casesPerMillion:  val / 10,
    deathsPerMillion: 0,
    updated:          new Date(`${raw.TimeDim || 2022}-01-01`).getTime(),
    todayCases:       0,
    todayDeaths:      0,
    // Use flagcdn for flags since WHO data has no flag URLs
    flag: iso2 && iso2 !== "XX"
      ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
      : null,
    continent:        raw.ParentLocationCode || null,
    year:             raw.TimeDim || null,
    incidencePer100k: raw.NumericValue || null,
  };
}

const SOURCES = {
  // ── COVID-19 — disease.sh (full real-time) ───────────────────────────────
  covid19: {
    provider: "disease.sh",
    label: "COVID-19",
    baseUrl: "https://disease.sh/v3/covid-19",
    endpoints: {
      all:        "/all",
      countries:  "/countries?sort=cases",
      country:    "/countries/:id",
      historical: "/historical/all?lastdays=:days",
      continents: "/continents",
    },
    transform: (raw) => ({
      country:          raw.country             ?? raw.continent ?? "Global",
      countryCode:      raw.countryInfo?.iso2   ?? raw.countryCode ?? "XX",
      lat:              raw.countryInfo?.lat     ?? raw.lat        ?? 0,
      lng:              raw.countryInfo?.long    ?? raw.lng        ?? 0,
      cases:            raw.cases               ?? 0,
      deaths:           raw.deaths              ?? 0,
      recovered:        raw.recovered           ?? 0,
      active:           raw.active              ?? 0,
      critical:         raw.critical            ?? 0,
      casesPerMillion:  raw.casesPerOneMillion  ?? 0,
      deathsPerMillion: raw.deathsPerOneMillion ?? 0,
      updated:          raw.updated             ?? Date.now(),
      todayCases:       raw.todayCases          ?? 0,
      todayDeaths:      raw.todayDeaths         ?? 0,
      flag:             raw.countryInfo?.flag   ?? null,
      continent:        raw.continent           ?? null,
    }),
  },

  // ── Mpox — WHO GHO (MPOX_CONF confirmed cases by country) ───────────────
  mpox: {
    provider: "WHO GHO",
    label: "Mpox",
    baseUrl: "https://ghoapi.azureedge.net/api",
    endpoints: {
      countries:  "/MPOX_CONF?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2023&$orderby=NumericValue desc",
      all:        "/MPOX_CONF?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2023",
      country:    "/MPOX_CONF?$filter=SpatialDim eq ':id'&$orderby=TimeDim desc&$top=1",
      historical: "/MPOX_CONF?$filter=SpatialDimType eq 'COUNTRY'&$orderby=TimeDim asc",
    },
    transform: ghoTransform,
  },

  // ── Influenza — WHO GHO (influenza positive specimens) ───────────────────
  influenza: {
    provider: "WHO GHO",
    label: "Influenza",
    baseUrl: "https://ghoapi.azureedge.net/api",
    endpoints: {
      countries:  "/RS_198?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2023&$orderby=NumericValue desc",
      all:        "/RS_198?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2023",
      country:    "/RS_198?$filter=SpatialDim eq ':id'&$orderby=TimeDim desc&$top=1",
      historical: "/RS_198?$filter=SpatialDimType eq 'COUNTRY'&$orderby=TimeDim asc",
    },
    transform: ghoTransform,
  },

  // ── Tuberculosis — WHO GHO (TB incidence per 100k) ──────────────────────
  tuberculosis: {
    provider: "WHO GHO",
    label: "Tuberculosis",
    baseUrl: "https://ghoapi.azureedge.net/api",
    endpoints: {
      countries:  "/MDG_0000000020?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022&$orderby=NumericValue desc",
      all:        "/MDG_0000000020?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022",
      country:    "/MDG_0000000020?$filter=SpatialDim eq ':id'&$orderby=TimeDim desc&$top=1",
      historical: "/MDG_0000000020?$filter=SpatialDimType eq 'COUNTRY'&$orderby=TimeDim asc",
    },
    transform: (raw) => {
      const base = ghoTransform(raw);
      // TB is incidence per 100k — scale to abs cases for display (per 100k * 1000 for rough absolute)
      const per100k = raw.NumericValue || 0;
      base.incidencePer100k = per100k;
      base.cases  = Math.round(per100k * 1000);
      base.active = base.cases;
      base.casesPerMillion = per100k * 10;
      return base;
    },
  },

  // ── Dengue — WHO GHO (DENGUE_CASES annual) ──────────────────────────────
  dengue: {
    provider: "WHO GHO",
    label: "Dengue",
    baseUrl: "https://ghoapi.azureedge.net/api",
    endpoints: {
      countries:  "/DENGUE_CASES?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022&$orderby=NumericValue desc",
      all:        "/DENGUE_CASES?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022",
      country:    "/DENGUE_CASES?$filter=SpatialDim eq ':id'&$orderby=TimeDim desc&$top=1",
      historical: "/DENGUE_CASES?$filter=SpatialDimType eq 'COUNTRY'&$orderby=TimeDim asc",
    },
    transform: ghoTransform,
  },

  // ── Cholera — WHO GHO (CHOLERA_0000000001 annual) ───────────────────────
  cholera: {
    provider: "WHO GHO",
    label: "Cholera",
    baseUrl: "https://ghoapi.azureedge.net/api",
    endpoints: {
      countries:  "/CHOLERA_0000000001?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022&$orderby=NumericValue desc",
      all:        "/CHOLERA_0000000001?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022",
      country:    "/CHOLERA_0000000001?$filter=SpatialDim eq ':id'&$orderby=TimeDim desc&$top=1",
      historical: "/CHOLERA_0000000001?$filter=SpatialDimType eq 'COUNTRY'&$orderby=TimeDim asc",
    },
    transform: ghoTransform,
  },

  // ── Measles — WHO GHO (WHS3_62 reported cases) ──────────────────────────
  measles: {
    provider: "WHO GHO",
    label: "Measles",
    baseUrl: "https://ghoapi.azureedge.net/api",
    endpoints: {
      countries:  "/WHS3_62?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022&$orderby=NumericValue desc",
      all:        "/WHS3_62?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022",
      country:    "/WHS3_62?$filter=SpatialDim eq ':id'&$orderby=TimeDim desc&$top=1",
      historical: "/WHS3_62?$filter=SpatialDimType eq 'COUNTRY'&$orderby=TimeDim asc",
    },
    transform: ghoTransform,
  },
};

function computeRiskScore(record) {
  const maxCPM   = 500000;
  const maxCases = 5000000;
  const casePct  = record.casesPerMillion > 1
    ? Math.min(record.casesPerMillion / maxCPM, 1) * 60
    : Math.min(record.cases / maxCases, 1) * 60;
  const deathPct  = Math.min((record.deathsPerMillion || 0) / 10000, 1) * 25;
  const activePct = record.cases > 0
    ? Math.min((record.active || 0) / record.cases, 1) * 15
    : 0;
  return Math.round(casePct + deathPct + activePct);
}

function getRiskLabel(score) {
  if (score >= 75) return { label: "Critical", color: "#dc2626" };
  if (score >= 50) return { label: "High",     color: "#ea580c" };
  if (score >= 25) return { label: "Moderate", color: "#ca8a04" };
  if (score >= 5)  return { label: "Low",      color: "#16a34a" };
  return             { label: "Minimal",  color: "#6b7280" };
}

module.exports = { SOURCES, computeRiskScore, getRiskLabel };
