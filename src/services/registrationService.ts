const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function registerWallet(walletAddress: string, telegramHandle: string) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      telegramHandle,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  return response.json();
}

interface Registration {
  walletAddress: string;
  telegramHandle: string;
  registeredAt: string;
}

interface PaginatedResponse {
  registrations: Registration[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export async function getAllRegistrations(page: number = 1, limit: number = 100): Promise<PaginatedResponse> {
  try {
    const response = await fetch(`${API_URL}/registrations?page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch registrations');
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return {
      registrations: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit
      }
    };
  }
}

export async function getRegistrationCount(): Promise<number> {
  try {
    const response = await fetch(`${API_URL}/registrations/count`);
    if (!response.ok) {
      throw new Error('Failed to fetch registration count');
    }
    const data = await response.json();
    return data.count;
  } catch (error) {
    console.error('Error fetching registration count:', error);
    return 0;
  }
}

export async function getRegistration(walletAddress: string) {
  const response = await fetch(`${API_URL}/registration/${walletAddress}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch registration');
  }

  return response.json();
}
