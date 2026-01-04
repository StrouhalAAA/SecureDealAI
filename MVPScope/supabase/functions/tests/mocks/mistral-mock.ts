export function createMistralMock() {
  return {
    extractORV: () => ({
      registrationPlateNumber: "5L94454",
      vin: "YV1PZA3TCL1103985",
      keeperName: "OSIT S.R.O.",
      make: "VOLVO",
      model: "V90 CROSS COUNTRY"
    }),
    extractOP: () => ({
      firstName: "JAN",
      lastName: "NOVAK",
      personalNumber: "800101/1234"
    })
  };
}
