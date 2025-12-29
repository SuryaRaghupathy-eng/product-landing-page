import type { SerperOrganicResult } from "@shared/schema";

const SERPER_API_URL = "https://google.serper.dev/search";
const SERPER_PLACES_API_URL = "https://google.serper.dev/places";
const MAX_PAGES = 5;

interface SerperResponse {
  organic: Array<{
    title: string;
    link: string;
    snippet?: string;
    position: number;
  }>;
  searchParameters: {
    q: string;
    gl: string;
    page: number;
  };
}

export async function fetchSerperResults(
  keyword: string,
  countryCode: string,
  page: number = 1
): Promise<{ results: SerperOrganicResult[]; resultsOnPage: number }> {
  const apiKey = process.env.SERPER_API_KEY;
  
  if (!apiKey) {
    throw new Error("SERPER_API_KEY environment variable is not set");
  }

  const response = await fetch(SERPER_API_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: keyword,
      gl: countryCode.toLowerCase(),
      page: page,
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data: SerperResponse = await response.json();
  
  if (!data.organic || data.organic.length === 0) {
    return { results: [], resultsOnPage: 0 };
  }
  
  return {
    results: data.organic.map((result) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
      position: result.position,
    })),
    resultsOnPage: data.organic.length,
  };
}

function extractDomain(url: string): string {
  try {
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = "http://" + normalizedUrl;
    }
    const urlObj = new URL(normalizedUrl);
    return (urlObj.hostname || "").toLowerCase().replace(/^www\./, "");
  } catch {
    return url.toLowerCase().replace(/^www\./, "");
  }
}

function domainMatches(resultLink: string, targetDomain: string): boolean {
  if (!resultLink) return false;
  
  const resultDomain = extractDomain(resultLink);
  const targetDomainClean = extractDomain(targetDomain);
  
  return resultDomain === targetDomainClean || resultDomain.endsWith(`.${targetDomainClean}`);
}

export interface RankingSearchResult {
  found: boolean;
  keyword: string;
  page: number | null;
  positionOnPage: number | null;
  overallPosition: number | null;
  url: string | null;
  title: string | null;
  error?: string;
}

export async function trackKeywordRanking(
  keyword: string,
  targetDomain: string,
  countryCode: string
): Promise<RankingSearchResult> {
  let totalPositionCount = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const { results, resultsOnPage } = await fetchSerperResults(keyword, countryCode, page);

      for (let index = 0; index < results.length; index++) {
        totalPositionCount += 1;
        const item = results[index];

        if (domainMatches(item.link, targetDomain)) {
          return {
            found: true,
            keyword,
            page,
            positionOnPage: index + 1,
            overallPosition: totalPositionCount,
            url: item.link,
            title: item.title,
          };
        }
      }

      if (resultsOnPage === 0) {
        break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error fetching page ${page} for keyword "${keyword}":`, errorMessage);
      return {
        found: false,
        keyword,
        page: null,
        positionOnPage: null,
        overallPosition: null,
        url: null,
        title: null,
        error: `Failed at page ${page}: ${errorMessage}`,
      };
    }
  }

  return {
    found: false,
    keyword,
    page: null,
    positionOnPage: null,
    overallPosition: null,
    url: null,
    title: null,
  };
}

export async function fetchAllPagesResults(
  keyword: string,
  countryCode: string
): Promise<{ results: SerperOrganicResult[]; error?: string }> {
  const allResults: SerperOrganicResult[] = [];
  let fetchError: string | undefined;
  
  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const { results, resultsOnPage } = await fetchSerperResults(keyword, countryCode, page);
      allResults.push(...results);
      
      if (resultsOnPage === 0) {
        break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error fetching page ${page} for keyword "${keyword}":`, errorMessage);
      fetchError = `Failed at page ${page}: ${errorMessage}`;
      break;
    }
  }
  
  return { results: allResults, error: fetchError };
}

export function findRankingForDomain(
  results: SerperOrganicResult[],
  targetDomain: string
): { position: number | null; url: string | null; title: string | null } {
  for (const result of results) {
    if (domainMatches(result.link, targetDomain)) {
      return {
        position: result.position,
        url: result.link,
        title: result.title,
      };
    }
  }
  
  return {
    position: null,
    url: null,
    title: null,
  };
}

interface SerperPlacesResponse {
  places: Array<{
    title: string;
    address?: string;
    website?: string;
    rating?: number;
    ratingCount?: number;
    position: number;
  }>;
}

export interface LocalRankingSearchResult {
  found: boolean;
  keyword: string;
  totalPlaces: number;
  matchingPlaces: Array<{
    title: string;
    address: string | null;
    website: string | null;
    rating: number | null;
    reviews: number | null;
    position: number;
  }>;
  error?: string;
}

async function fetchPlacesPage(
  keyword: string,
  countryCode: string,
  page: number,
  apiKey: string
): Promise<{ places: SerperPlacesResponse["places"]; hasResults: boolean }> {
  const response = await fetch(SERPER_PLACES_API_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: keyword,
      gl: countryCode.toLowerCase(),
      page: page,
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data: SerperPlacesResponse = await response.json();
  const places = data.places || [];
  
  return {
    places,
    hasResults: places.length > 0,
  };
}

export async function trackLocalRanking(
  keyword: string,
  targetDomain: string,
  countryCode: string
): Promise<LocalRankingSearchResult> {
  const apiKey = process.env.SERPER_API_KEY;
  
  if (!apiKey) {
    throw new Error("SERPER_API_KEY environment variable is not set");
  }

  const allPlaces: SerperPlacesResponse["places"] = [];
  const matchingPlaces: LocalRankingSearchResult["matchingPlaces"] = [];
  let totalPositionCount = 0;

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { places, hasResults } = await fetchPlacesPage(keyword, countryCode, page, apiKey);
      
      if (!hasResults) {
        break;
      }

      for (let i = 0; i < places.length; i++) {
        totalPositionCount += 1;
        const place = places[i];
        allPlaces.push(place);
        
        if (place.website && domainMatches(place.website, targetDomain)) {
          matchingPlaces.push({
            title: place.title,
            address: place.address || null,
            website: place.website || null,
            rating: place.rating || null,
            reviews: place.ratingCount || null,
            position: totalPositionCount,
          });
        }
      }
    }

    return {
      found: matchingPlaces.length > 0,
      keyword,
      totalPlaces: allPlaces.length,
      matchingPlaces,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error fetching local rankings for keyword "${keyword}":`, errorMessage);
    return {
      found: false,
      keyword,
      totalPlaces: allPlaces.length,
      matchingPlaces,
      error: errorMessage,
    };
  }
}
