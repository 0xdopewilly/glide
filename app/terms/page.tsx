import { LegalShell } from "@/components/legal-shell";

export const metadata = {
  title: "Terms — glidepay",
  description: "Terms of service for glidepay.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="May 31, 2026">
      <p>
        Welcome to glidepay. By using the app you agree to these terms. Read
        them — they're short.
      </p>

      <h2>What glidepay is</h2>
      <p>
        glidepay is a mobile-first stablecoin wallet built on Arc, Circle's
        payments blockchain. We let you send, receive, swap, and bridge
        stablecoins (USDC, EURC, cirBTC) using a smart account managed by
        Circle. We are not a bank, broker-dealer, or money transmitter. We
        don't take custody of your funds — Circle does.
      </p>

      <h2>Testnet status</h2>
      <p>
        glidepay currently operates on <strong>Arc testnet</strong>. Tokens on
        testnet have <strong>no monetary value</strong>. Do not treat anything
        you see in the app as real money. We make no guarantees about
        availability, performance, or data retention during the testnet phase.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Keep your email and authentication credentials secure. Anyone with
          access to your email can take over your glidepay account.</li>
        <li>Only send to addresses and people you trust. Crypto transactions
          are irreversible.</li>
        <li>Don't use glidepay for anything illegal, fraudulent, or harmful.
          This includes money laundering, tax evasion, sanctions evasion,
          financing of terrorism, and impersonation.</li>
        <li>You're responsible for any taxes owed on your activity.</li>
      </ul>

      <h2>Our responsibilities</h2>
      <ul>
        <li>We make a good-faith effort to keep the service up and secure, but
          we don't promise uninterrupted operation.</li>
        <li>We don't guarantee that any feature will continue to exist.
          Testnet features may change or disappear.</li>
        <li>We will give reasonable notice before deleting accounts or data
          we've stored, except where required by law or to address abuse.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        You may not (a) use the app in any jurisdiction where doing so is
        unlawful; (b) attempt to interfere with, decompile, or reverse-engineer
        the app; (c) abuse our service infrastructure (denial-of-service,
        scraping, mass-spam); (d) misrepresent yourself as another user or
        entity.
      </p>

      <h2>Crypto risk</h2>
      <p>
        Cryptocurrencies, stablecoins, and on-chain transactions involve risk.
        Smart contracts can have bugs. Blockchains can have outages.
        Stablecoins can de-peg. You accept these risks when using glidepay.
        On mainnet (when we get there) this will matter much more than on
        testnet.
      </p>

      <h2>No warranty, limited liability</h2>
      <p>
        The service is provided "as is" without warranty of any kind, express
        or implied. To the maximum extent permitted by law, our total
        liability for any claim arising from your use of glidepay is limited
        to USD $100 or the amount you've paid us in the last 12 months,
        whichever is greater. (You haven't paid us anything; we don't charge
        for the testnet app. The cap exists for legal completeness.)
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. Material changes will be announced in-app.
        Continued use after a change means you accept the new terms.
      </p>

      <h2>Termination</h2>
      <p>
        You can delete your account at any time from Profile → Delete account.
        We may suspend or terminate accounts that violate these terms.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Delaware, USA.
        Any disputes will be resolved in Delaware courts.
      </p>

      <h2>Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:support@glidepay.app">support@glidepay.app</a>.
      </p>
    </LegalShell>
  );
}
