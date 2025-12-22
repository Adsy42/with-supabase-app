/**
 * Seed Test Documents Script
 * Creates sample document chunks for testing the RAG pipeline
 *
 * Usage:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment
 * 2. Run: npx tsx scripts/seed-test-documents.ts <user_id>
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: npx tsx scripts/seed-test-documents.ts <user_id>");
  console.error("Get your user_id from the Supabase dashboard or auth response");
  process.exit(1);
}

// Sample Australian legal documents for testing
const testDocuments = [
  {
    document_name: "Employment Agreement - Sample.pdf",
    chunks: [
      {
        chunk_index: 0,
        content: `EMPLOYMENT AGREEMENT

This Employment Agreement is entered into as of [Date] between:

Employer: [Company Name] ABN [Number] ("Employer")
Employee: [Employee Name] ("Employee")

1. POSITION AND DUTIES
The Employer agrees to employ the Employee in the position of [Job Title]. The Employee shall perform such duties as are customary for this position and as may be assigned by the Employer from time to time.

2. COMMENCEMENT AND TERM
This employment shall commence on [Start Date] and continue until terminated in accordance with this Agreement.`,
        metadata: { page: 1 },
      },
      {
        chunk_index: 1,
        content: `3. REMUNERATION
The Employee shall be paid an annual salary of $[Amount] (inclusive of superannuation) payable in accordance with the Employer's normal payroll practices.

4. LEAVE ENTITLEMENTS
The Employee shall be entitled to:
- Annual leave: 4 weeks per year of service
- Personal/carer's leave: 10 days per year
- Long service leave: as per applicable State legislation

5. NOTICE PERIOD
Either party may terminate this employment by giving [X] weeks' written notice or payment in lieu of notice.`,
        metadata: { page: 2 },
      },
      {
        chunk_index: 2,
        content: `6. CONFIDENTIALITY
The Employee agrees to maintain the confidentiality of all Confidential Information of the Employer both during and after the term of employment. "Confidential Information" includes but is not limited to trade secrets, business strategies, client lists, financial information, and any other information not generally known to the public.

7. INTELLECTUAL PROPERTY
All Intellectual Property created by the Employee in the course of their employment shall be the sole property of the Employer.

8. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of [State/Territory], Australia.`,
        metadata: { page: 3 },
      },
    ],
  },
  {
    document_name: "Commercial Lease Agreement.pdf",
    chunks: [
      {
        chunk_index: 0,
        content: `COMMERCIAL LEASE AGREEMENT

Parties:
Landlord: [Landlord Name] ABN [Number]
Tenant: [Tenant Name] ABN [Number]

Premises: [Address]

1. GRANT OF LEASE
The Landlord grants to the Tenant the right to occupy and use the Premises for the purpose of [Business Purpose] for the Term specified below.

2. TERM
Initial Term: [X] years commencing [Start Date]
Option to Renew: [X] further terms of [X] years each`,
        metadata: { page: 1 },
      },
      {
        chunk_index: 1,
        content: `3. RENT
Base Rent: $[Amount] per annum plus GST
Outgoings: The Tenant shall pay a proportionate share of outgoings including council rates, water rates, insurance, and building management fees.
Rent Review: Annual CPI adjustment or market review every [X] years.

4. SECURITY DEPOSIT
The Tenant shall pay a security deposit equivalent to [X] months' rent to be held by the Landlord as security for the Tenant's obligations.

5. PERMITTED USE
The Tenant shall use the Premises only for [Specified Purpose] and shall not use or permit the Premises to be used for any other purpose without the Landlord's prior written consent.`,
        metadata: { page: 2 },
      },
      {
        chunk_index: 2,
        content: `6. TENANT'S OBLIGATIONS
The Tenant must:
(a) Keep the Premises clean and in good repair
(b) Not make alterations without Landlord consent
(c) Comply with all applicable laws and regulations
(d) Maintain appropriate insurance coverage
(e) Pay all charges for utilities consumed at the Premises

7. MAKE GOOD
At the end of the lease, the Tenant must restore the Premises to the condition at commencement, fair wear and tear excepted, and remove all fixtures and fittings installed by the Tenant.

8. ASSIGNMENT AND SUBLETTING
The Tenant shall not assign this Lease or sublet the Premises without the Landlord's prior written consent, which shall not be unreasonably withheld.`,
        metadata: { page: 3 },
      },
    ],
  },
  {
    document_name: "Privacy Policy.pdf",
    chunks: [
      {
        chunk_index: 0,
        content: `PRIVACY POLICY

Last updated: [Date]

1. INTRODUCTION
This Privacy Policy explains how [Company Name] ABN [Number] ("we", "us", "our") collects, uses, discloses, and protects your personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).

2. PERSONAL INFORMATION WE COLLECT
We may collect the following types of personal information:
- Name and contact details (email, phone, address)
- Date of birth
- Financial information (for billing purposes)
- Usage data and preferences
- Any other information you provide to us`,
        metadata: { page: 1 },
      },
      {
        chunk_index: 1,
        content: `3. HOW WE USE YOUR INFORMATION
We use your personal information for the following purposes:
- To provide our products and services
- To process payments and manage accounts
- To communicate with you about our services
- To comply with legal obligations
- To improve our services and develop new features
- For marketing purposes (with your consent)

4. DISCLOSURE OF INFORMATION
We may disclose your personal information to:
- Our service providers and contractors
- Professional advisors
- Government agencies when required by law
- Related entities within our corporate group`,
        metadata: { page: 2 },
      },
      {
        chunk_index: 2,
        content: `5. YOUR RIGHTS
Under the Australian Privacy Principles, you have the right to:
- Access your personal information held by us
- Request correction of inaccurate information
- Opt-out of marketing communications
- Lodge a complaint about our handling of your information

6. DATA SECURITY
We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, loss, or misuse.

7. CONTACT US
For privacy inquiries or to exercise your rights, contact our Privacy Officer:
Email: privacy@[company].com.au
Phone: [Number]
Address: [Address]`,
        metadata: { page: 3 },
      },
    ],
  },
];

async function seedDocuments() {
  console.log("Seeding test documents for user:", userId);

  for (const doc of testDocuments) {
    console.log(`\nInserting: ${doc.document_name}`);

    for (const chunk of doc.chunks) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/document_chunks`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          user_id: userId,
          document_name: doc.document_name,
          chunk_index: chunk.chunk_index,
          content: chunk.content,
          metadata: chunk.metadata,
          // Note: embedding is null - use Isaacus to generate embeddings
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`  Error inserting chunk ${chunk.chunk_index}:`, error);
      } else {
        console.log(`  Chunk ${chunk.chunk_index} inserted`);
      }
    }
  }

  console.log("\n✅ Seed complete!");
  console.log(
    "\nNote: Embeddings are not populated. To enable RAG, you need to:"
  );
  console.log("1. Set up Isaacus API key");
  console.log("2. Run embeddings on these chunks");
}

seedDocuments().catch(console.error);

