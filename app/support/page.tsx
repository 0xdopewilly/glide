import { LegalShell } from "@/components/legal-shell";

export const metadata = {
  title: "Support — glidepay",
  description: "Get help with glidepay.",
};

export default function SupportPage() {
  return (
    <LegalShell title="Support" updated="May 31, 2026">
      <p>
        Need help with glidepay? We're a small team and respond as fast as we
        can. Below are the fastest ways to reach us depending on what you need.
      </p>

      <h2>Contact us</h2>
      <ul>
        <li>
          <strong>General help</strong>:{" "}
          <a href="mailto:support@glidepay.app">support@glidepay.app</a>
        </li>
        <li>
          <strong>Bug reports</strong>:{" "}
          <a href="mailto:bugs@glidepay.app">bugs@glidepay.app</a> — please
          include what you tried, what you expected, what happened, and a
          screenshot if possible.
        </li>
        <li>
          <strong>Privacy / data requests</strong>:{" "}
          <a href="mailto:privacy@glidepay.app">privacy@glidepay.app</a>
        </li>
        <li>
          <strong>Security disclosures</strong>:{" "}
          <a href="mailto:security@glidepay.app">security@glidepay.app</a> —
          please do not disclose vulnerabilities publicly before contacting
          us.
        </li>
      </ul>

      <h2>Common questions</h2>

      <h2>What's testnet?</h2>
      <p>
        glidepay runs on Arc testnet — a sandbox version of the blockchain
        used for development. Test tokens (USDC, EURC, cirBTC) on testnet have
        no real monetary value. You can play with all features risk-free.
      </p>

      <h2>I sent money and the recipient didn't receive it</h2>
      <p>
        Check Activity for the transaction status. If it shows "failed" or
        "pending" for more than a few minutes, email support with the
        transaction hash (you can copy it from the Activity row).
      </p>

      <h2>I lost access to my email</h2>
      <p>
        glidepay accounts are tied to your email via Clerk. If you've lost
        access, email{" "}
        <a href="mailto:support@glidepay.app">support@glidepay.app</a> from a
        related address with as much detail as you can. We'll work with you to
        verify identity.
      </p>

      <h2>How do I withdraw my funds before deleting my account?</h2>
      <p>
        Use Bridge (Arc → another chain) or Send (any wallet address) to move
        your stablecoins out of your glidepay-managed wallet before deleting.
        Once deleted, your account-side data is gone but the on-chain balance
        remains — just orphaned from your Glide login.
      </p>

      <h2>How can I follow updates?</h2>
      <p>
        We post product updates and announcements in-app. We don't have a
        social or newsletter yet — coming when we hit mainnet.
      </p>
    </LegalShell>
  );
}
