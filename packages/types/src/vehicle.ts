export type CreateVehicleRequest = {
  customerId: number;
  licensePlate: string;
  make: string;
  model: string;
  year?: number | null;
  initialOdometer?: number | null;
  odometerUnit: "km" | "mi";
};

export type VehicleResponse = {
  id: number;
  customerId: number;
  licensePlate: string;
  make: string;
  model: string;
  year: number | null;
  initialOdometer: number | null;
  odometerUnit: "km" | "mi";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
