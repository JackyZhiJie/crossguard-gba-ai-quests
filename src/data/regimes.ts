export type Region = 'HK' | 'MO' | 'CN';

export const REGION_LABEL: Record<Region, { en: string; zh: string; short: string }> = {
  HK: { en: 'Hong Kong', zh: '香港', short: 'HK' },
  MO: { en: 'Macau', zh: '澳門', short: 'MO' },
  CN: { en: 'Mainland GBA', zh: '內地大灣區', short: 'GBA' },
};

export interface Regime {
  region: Region;
  laws: string[];
  style: string;
}

export const REGIMES: Regime[] = [
  {
    region: 'HK',
    laws: ['Personal Data (Privacy) Ordinance (PDPO, Cap. 486)', 'PCPD Ethical AI guidance & Model Framework (2024)'],
    style: 'Principles-based; consent and use limitation (DPP1, DPP3); human accountability.',
  },
  {
    region: 'MO',
    laws: ['Personal Data Protection Act (Law 8/2005)', 'Cybersecurity Law (Law 13/2019)'],
    style: 'Transfers out of Macau need adequate protection or authorisation from the data protection authority.',
  },
  {
    region: 'CN',
    laws: [
      'Personal Information Protection Law (PIPL, 2021)',
      'Algorithm Recommendation Provisions (2022)',
      'Interim Measures for Generative AI Services (2023)',
      'AI-generated content labelling measures (2025)',
    ],
    style: 'Data localisation, algorithm filing, content safety and labelling duties.',
  },
];

export interface CommonControl {
  control: string;
  drivenBy: string;
  response: string;
}

// The core principle: "comply once, certify three times".
export const COMMON_CONTROLS: CommonControl[] = [
  { control: 'Data localisation and transfer', drivenBy: 'Mainland PIPL; Macau PDPA', response: 'Edge processing and federated learning' },
  { control: 'Algorithm transparency and filing', drivenBy: 'Mainland Algorithm Recommendation Provisions', response: 'Public register and trilingual model cards' },
  { control: 'Human oversight and accountability', drivenBy: 'Hong Kong ethical AI principles', response: 'Human-in-the-loop; named accountable officer' },
  { control: 'Generated content safety', drivenBy: 'Mainland Generative AI Measures', response: 'Template-bound notices, operator approval' },
];

export const HARMONISATION_STEPS = [
  { key: 'Classify', zh: '分級', text: 'Put the use case in a risk tier by its impact on safety and rights.' },
  { key: 'Map', zh: '對照', text: 'Map every obligation across the three regimes and adopt the strictest version as one common control.' },
  { key: 'Architect', zh: '設計', text: 'Build the controls into the design, keeping personal data local wherever possible.' },
  { key: 'Assure', zh: '保證', text: 'A Joint Review Panel of all three jurisdictions plus trilingual public reporting.' },
];
