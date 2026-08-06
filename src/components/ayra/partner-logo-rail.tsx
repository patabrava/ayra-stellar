import Image from "next/image";

const partnerLogos = [
  {
    alt: "Stellar Development Foundation",
    className: "partner-logo partner-logo-stellar",
    height: 161,
    src: "/partners/stellar-development-foundation.png",
    width: 631,
  },
  {
    alt: "Climate Future Foundation",
    className: "partner-logo partner-logo-climate",
    height: 433,
    src: "/partners/climate-future-foundation.png",
    width: 1398,
  },
  {
    alt: "Sparkclub",
    className: "partner-logo partner-logo-sparkclub",
    height: 642,
    src: "/partners/sparkclub-logo.svg",
    width: 2495,
  },
] as const;

export function PartnerLogoRail() {
  return (
    <section aria-label="Partners" className="partner-logo-rail">
      {partnerLogos.map((logo) => (
        <div className="partner-logo-item" key={logo.alt}>
          <Image
            alt={logo.alt}
            className={logo.className}
            height={logo.height}
            sizes="(max-width: 560px) 68vw, 28vw"
            src={logo.src}
            width={logo.width}
          />
        </div>
      ))}
    </section>
  );
}
