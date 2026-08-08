export interface PriceCalculationParams {
  basePrice: number;
  addOns: Array<{ price: number; quantity: number }>;
  weeklyCustomizations: Array<{ price: number; days: string[] }>;
  deliveryCharge: number;
  discountAmount: number;
  quantity: number;
  selectedDays?: string[];
}

export const calculateFinalAmount = (params: PriceCalculationParams): number => {
  const {
    basePrice,
    addOns,
    weeklyCustomizations,
    deliveryCharge,
    discountAmount,
    quantity,
    selectedDays = []
  } = params;

  // Add-ons calculation
  const addOnsTotal = addOns.reduce((total, addOn) => 
    total + (addOn.price * addOn.quantity), 0);

  // Weekly customizations calculation
  const weeklyCustomizationsTotal = weeklyCustomizations.reduce((total, custom) => {
    const applicableDays = custom.days.filter(day => selectedDays.includes(day));
    return total + (custom.price * applicableDays.length);
  }, 0);

  // Final calculation
  const subtotal = basePrice + addOnsTotal + weeklyCustomizationsTotal;
  const finalAmount = subtotal + deliveryCharge - discountAmount;

  return Math.max(0, finalAmount); // Ensure non-negative
};