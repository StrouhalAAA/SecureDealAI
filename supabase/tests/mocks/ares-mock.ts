export function createAresMock() {
  return {
    lookup: (ico: string) => {
      if (ico === "27074358") {
        return {
          ico: "27074358",
          obchodniJmeno: "OSIT S.R.O.",
          dic: "CZ27074358",
          sidlo: { textovaAdresa: "Praha 1, Staromestske nam. 1" }
        };
      }
      return null;
    }
  };
}
