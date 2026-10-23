export interface Project {
  title: string;
  kind: string;
  url?: string;
  description: string;
  tags: string[];
  color: "cyan" | "magenta" | "yellow" | "green";
}

export const projects: Project[] = [
  {
    title: "Northern Rodeo Association",
    kind: "Web App",
    url: "https://montanacodeworks.com/",
    description:
      "A membership and event management platform for a regional rodeo association. Members buy their membership card, enter rodeos (alone or as a buddy group), and follow the draw, results and season standings. The office builds each rodeo program through a guided setup flow, takes entries, generates the draw from priority scores, records results, and exports draw and results sheets to Excel.",
    tags: ["Next.js", "React", "TypeScript", "PostgreSQL", "Drizzle", "Auth.js", "Stripe", "Tailwind CSS"],
    color: "cyan",
  },
  {
    title: "Groj",
    kind: "Mobile App",
    description:
      "A mobile app for discovering, planning and posting neighborhood garage, yard and estate sales. Shoppers browse nearby sales in a list or on a map, bookmark them into a day plan, and save searches. Sellers post a sale through a step-by-step flow and can optionally accept card payments in person. It's designed for an older, less tech-savvy audience, with large touch targets, clear labels and high-contrast text.",
    tags: ["React Native", "Expo", "TypeScript", "Go", "AWS Lambda", "DynamoDB", "Cognito", "Stripe Connect", "AWS CDK"],
    color: "magenta",
  },
];
