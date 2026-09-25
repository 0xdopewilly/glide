const baseElements = {
  rootBox: "w-full clerk-auth-root",
  cardBox: "shadow-none w-full",
  card: "bg-transparent shadow-none border-0 gap-4 p-0",
  headerTitle: "text-[1.5rem] font-semibold tracking-tight text-left",
  headerSubtitle: "text-left text-[15px]",
  socialButtonsBlockButton:
    "border rounded-full py-3 h-auto font-medium",
  socialButtonsBlockButtonText: "font-medium",
  formButtonPrimary:
    "rounded-2xl py-3 h-auto text-sm font-semibold normal-case shadow-none",
  formFieldLabel: "text-sm font-medium",
  formFieldInput: "rounded-xl border py-3 text-base",
  formFieldInputShowPasswordButton: "text-inherit",
  otpCodeFieldInput:
    "rounded-xl border py-3 text-center text-lg font-semibold tracking-[0.2em]",
  otpCodeFieldInputs: "gap-2 justify-center",
  footerActionLink: "font-medium",
  footerActionText: "opacity-90",
  dividerLine: "opacity-100",
  dividerText: "text-xs uppercase tracking-wider",
  identityPreviewEditButton: "font-medium",
  identityPreviewText: "font-medium",
  formResendCodeLink: "font-medium",
  alternativeMethodsBlockButton: "font-medium",
  navbarButton: "font-medium",
  formFieldSuccessText: "text-sm",
  formFieldErrorText: "text-sm",
  formFieldWarningText: "text-sm",
} as const;

const lightAppearance = {
  variables: {
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#062448",
    colorText: "#062448",
    colorTextSecondary: "#5D6B85",
    colorPrimary: "#5B3DF5",
    colorDanger: "#EF4444",
    colorSuccess: "#16C784",
    colorNeutral: "rgba(91, 61, 245, 0.16)",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    ...baseElements,
    headerTitle: `${baseElements.headerTitle} !text-[#062448]`,
    headerSubtitle: `${baseElements.headerSubtitle} !text-[#5D6B85]`,
    socialButtonsBlockButton:
      "!bg-white !border-[#E7EDF5] !text-[#062448] hover:!bg-[#F7F9FC]",
    socialButtonsBlockButtonText: "!text-[#062448]",
    formFieldInput:
      "!bg-white !border-[#E7EDF5] !text-[#062448] placeholder:!text-[#A9B7D0]",
    formFieldLabel: "!text-[#5D6B85]",
    formButtonPrimary:
      "!bg-[#5B3DF5] !text-white hover:!bg-[#4A2EE0] !shadow-none !rounded-full py-3 h-auto text-sm font-semibold normal-case glow-green",
    otpCodeFieldInput:
      "!bg-white !border-[#E7EDF5] !text-[#062448] caret-[#5B3DF5]",
    footerActionLink: "!text-[#5B3DF5] !font-semibold",
    footerActionText: "!text-[#5D6B85]",
    dividerLine: "!bg-[#E7EDF5]",
    dividerText: "!text-[#5D6B85]",
    identityPreviewEditButton: "!text-[#5B3DF5]",
    identityPreviewText: "!text-[#062448]",
    formResendCodeLink: "!text-[#5B3DF5]",
    alternativeMethodsBlockButton: "!text-[#5B3DF5]",
    navbarButton: "!text-[#062448]",
  },
};

/** The violet dark theme puts content on white cards, so the sign-in card is
 * the white one in both themes. */
const darkAppearance = lightAppearance;

export function getClerkAppearance(theme: "light" | "dark") {
  return theme === "dark" ? darkAppearance : lightAppearance;
}

/** @deprecated Use getClerkAppearance with theme - kept for type re-exports */
export const clerkAppearance = darkAppearance;
