// Firecrawl API Response Types
export interface SearchResponse {
  success: boolean;
  data: Array<{
    title: string;
    description: string;
    url: string;
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    screenshot?: string;
    metadata?: {
      title: string;
      description: string;
      sourceURL: string;
      statusCode: number;
      error: string;
    };
  }>;
  warning?: string | null;
}

export interface ExtractResponse {
  success: boolean;
  error?: string;
  data?: {
    categories?: CategoryInstructions[];
    category?: string;
    instructions?: string[];
    title?: string;
    tips?: string[];
    content?: string;
    [key: string]: any; // Allow for any additional properties
  };
  status?: string;
  expiresAt?: string;
}

// Category with instructions
export interface CategoryInstructions {
  category: string;
  instructions: string[];
}

// Package Rules Types
export interface PackageRule {
  packageName: string;
  description?: string;
  categories: CategoryInstructions[];
}

export interface GenerateRulesRequest {
  packages: string[];
}

export interface GenerateRulesResponse {
  success: boolean;
  data?: PackageRule[];
  message?: string;
}
