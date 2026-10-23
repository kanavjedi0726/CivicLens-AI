import type { CivicReport } from './types';

export const SAMPLE_REPORTS: CivicReport[] = [
  {
    id: 'demo-001',
    rawDescription:
      'There is a massive pothole on Main Street near the intersection with Oak Avenue. It is about 30cm deep and has already caused two flat tyres that I know of. Very dangerous especially at night.',
    location: 'Main Street & Oak Avenue',
    analysis: {
      category: 'pothole',
      title: 'Deep Pothole — Main St & Oak Ave Intersection',
      summary:
        'A severe 30 cm pothole at a busy intersection is causing tyre damage and poses a serious safety risk to road users, particularly at night.',
      urgency: 'high',
      suggestedDepartment: 'Public Works — Road Maintenance',
      recommendedAction:
        'Deploy road crew within 48 hours to assess and fill pothole; place temporary warning cones immediately.',
      extractedLocation: 'Main Street & Oak Avenue',
      keyEvidence: [
        '~30 cm depth reported',
        'Two tyre casualties confirmed',
        'High-traffic intersection',
        'Night-time visibility hazard',
      ],
    },
    analysisError: null,
    status: 'acknowledged',
    isDemo: true,
    isUnanalysed: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    duplicateSuggestions: [],
  },
  {
    id: 'demo-002',
    rawDescription:
      'Garbage bags piling up on Elm Street for the past 10 days. The smell is unbearable and rats have been spotted. Residents are complaining. Please help.',
    location: 'Elm Street, Block 4',
    analysis: {
      category: 'garbage',
      title: 'Uncollected Waste — Elm Street (10+ days)',
      summary:
        'Garbage has accumulated for over 10 days on Elm Street, attracting rats and creating public health and nuisance issues for local residents.',
      urgency: 'critical',
      suggestedDepartment: 'Sanitation & Waste Management',
      recommendedAction:
        'Urgent collection within 24 hours; conduct pest-control assessment; investigate missed collection schedule.',
      extractedLocation: 'Elm Street, Block 4',
      keyEvidence: [
        '10+ days of accumulation',
        'Rat sightings confirmed',
        'Odour complaints from multiple residents',
        'Public health risk',
      ],
    },
    analysisError: null,
    status: 'in_progress',
    isDemo: true,
    isUnanalysed: false,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    duplicateSuggestions: [],
  },
  {
    id: 'demo-003',
    rawDescription:
      'The streetlight at Park Road outside the school has been out for 3 weeks. Children walk home in complete darkness after evening activities. Urgent fix needed.',
    location: 'Park Road, outside St Mary\'s School',
    analysis: {
      category: 'streetlight',
      title: 'Broken Streetlight — Park Road School Zone',
      summary:
        'A streetlight near a school has been non-functional for 3 weeks, creating unsafe dark conditions for children walking home in the evenings.',
      urgency: 'high',
      suggestedDepartment: 'Electrical Services & Street Lighting',
      recommendedAction:
        'Inspect and replace bulb/fixture within 72 hours; prioritise due to school proximity and child safety.',
      extractedLocation: "Park Road, outside St Mary's School",
      keyEvidence: [
        '3 weeks non-functional',
        'School zone — child safety concern',
        'Evening pedestrian risk',
      ],
    },
    analysisError: null,
    status: 'new',
    isDemo: true,
    isUnanalysed: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    duplicateSuggestions: [],
  },
  {
    id: 'demo-004',
    rawDescription:
      'Water is leaking from a cracked pipe on Cedar Lane. The pavement is flooded and water is entering the nearby shop basement. Pipe looks old and corroded.',
    location: 'Cedar Lane near the post office',
    analysis: {
      category: 'water_leak',
      title: 'Burst Water Main — Cedar Lane',
      summary:
        'A corroded water main on Cedar Lane is flooding the pavement and causing water ingress into an adjacent commercial property, requiring urgent infrastructure repair.',
      urgency: 'critical',
      suggestedDepartment: 'Water & Utilities Authority',
      recommendedAction:
        'Emergency crew dispatch within 4 hours; isolate section; assess structural damage to pavement and building.',
      extractedLocation: 'Cedar Lane, near post office',
      keyEvidence: [
        'Active flooding on pavement',
        'Water ingressing into shop basement',
        'Visibly corroded/old pipe',
        'Commercial property at risk',
      ],
    },
    analysisError: null,
    status: 'resolved',
    isDemo: true,
    isUnanalysed: false,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    duplicateSuggestions: [],
  },
];
