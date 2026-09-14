export type FoodOrderingEvalFixture = Readonly<{
  home: Readonly<{
    location: string;
    primaryActionBackground: string;
    locationFontSize: number;
    locationTranslateY: number;
    headerSpacing: number;
  }>;
  about: Readonly<{
    title: string;
  }>;
}>;

export const baselineFixture: FoodOrderingEvalFixture = Object.freeze({
  home: Object.freeze({
    location: "送至 · 望京",
    primaryActionBackground: "#FF7300",
    locationFontSize: 15,
    locationTranslateY: 0,
    headerSpacing: 0,
  }),
  about: Object.freeze({
    title: "Profile",
  }),
});
