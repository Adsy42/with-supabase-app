/**
 * Few-Shot Examples for Legal AI
 * Sample clauses, analysis patterns, and response templates
 * Used primarily in Document Drafting mode for style consistency
 */

// ============================================================================
// CLAUSE EXAMPLES - Common contract clauses in Australian style
// ============================================================================

export const CLAUSE_EXAMPLES = {
  // -------------------------------------------------------------------------
  // CONFIDENTIALITY CLAUSES
  // -------------------------------------------------------------------------
  confidentiality: {
    standard: `**Confidentiality**

1.1 **Confidential Information** means all information disclosed by one party (**Disclosing Party**) to the other party (**Receiving Party**) that:
    (a) is designated as confidential; or
    (b) the Receiving Party knows or ought reasonably to know is confidential.

1.2 The Receiving Party must:
    (a) keep the Confidential Information confidential;
    (b) not disclose the Confidential Information to any person except as permitted under this clause;
    (c) use the Confidential Information only for the Purpose; and
    (d) take all reasonable steps to prevent unauthorised access to the Confidential Information.

1.3 The Receiving Party may disclose Confidential Information:
    (a) to its officers, employees, contractors and advisers who need to know for the Purpose, provided they are bound by obligations of confidentiality; or
    (b) as required by law or the rules of any stock exchange.`,

    enhanced: `**Confidentiality**

1.1 **Confidential Information** means:
    (a) all information (whether oral, written, electronic or in any other form) disclosed by or on behalf of the Disclosing Party to the Receiving Party, including information relating to the Disclosing Party's:
        (i) business, operations, systems and processes;
        (ii) customers, suppliers and other business relationships;
        (iii) financial information and projections;
        (iv) intellectual property and know-how;
        (v) strategies, plans and opportunities; and
        (vi) personnel and organisational matters;
    (b) any analysis, compilation, study or other material prepared by the Receiving Party that contains or reflects such information; and
    (c) the existence and terms of this Agreement,
    but excludes information that:
    (d) is or becomes publicly available other than through a breach of this Agreement;
    (e) was lawfully in the Receiving Party's possession before disclosure;
    (f) is independently developed by the Receiving Party; or
    (g) is disclosed to the Receiving Party by a third party entitled to disclose it.

1.2 The Receiving Party must:
    (a) hold the Confidential Information in strict confidence;
    (b) not disclose the Confidential Information to any person except as expressly permitted;
    (c) use the Confidential Information solely for the Purpose;
    (d) apply security measures no less stringent than those it applies to its own confidential information of similar sensitivity (and in any event, reasonable security measures);
    (e) immediately notify the Disclosing Party of any suspected or actual unauthorised access to or disclosure of Confidential Information; and
    (f) on request, return or destroy all Confidential Information and certify compliance.`,

    mutual: `**Mutual Confidentiality**

1.1 Each party (**Receiving Party**) acknowledges that in connection with this Agreement it may receive Confidential Information from the other party (**Disclosing Party**).

1.2 **Confidential Information** means all information of a confidential nature disclosed by the Disclosing Party, including business, financial, technical, operational and strategic information, but excludes information that is:
    (a) publicly available through no fault of the Receiving Party;
    (b) rightfully received from a third party without restriction;
    (c) independently developed without use of Confidential Information; or
    (d) required to be disclosed by law.

1.3 Each party agrees to:
    (a) protect the other party's Confidential Information with the same degree of care as its own;
    (b) use Confidential Information only for purposes of this Agreement;
    (c) limit disclosure to personnel who need to know; and
    (d) notify the other party promptly of any unauthorised disclosure.`,
  },

  // -------------------------------------------------------------------------
  // INDEMNITY CLAUSES
  // -------------------------------------------------------------------------
  indemnity: {
    seller_friendly: `**Indemnity**

1.1 The Buyer indemnifies the Seller against all losses, liabilities, damages, costs and expenses (including legal costs on a full indemnity basis) arising from or in connection with:
    (a) any breach of this Agreement by the Buyer;
    (b) any negligent or wrongful act or omission of the Buyer; or
    (c) any claim by a third party arising from the Buyer's use of the Goods.

1.2 This indemnity is a continuing obligation, independent of the Buyer's other obligations under this Agreement, and survives termination.`,

    buyer_friendly: `**Indemnity**

1.1 The Seller indemnifies the Buyer against all Losses arising from or in connection with:
    (a) any breach of this Agreement by the Seller;
    (b) any breach of a Seller Warranty;
    (c) any negligent or wrongful act or omission of the Seller;
    (d) any infringement of third party intellectual property rights by the Goods; or
    (e) any product liability claim relating to the Goods.

1.2 **Losses** means all losses, liabilities, damages, costs, charges, expenses, actions, proceedings, claims and demands, including reasonable legal costs.

1.3 The Seller's obligation to indemnify is reduced to the extent the Loss is caused or contributed to by the Buyer's negligence or breach.`,

    balanced: `**Mutual Indemnity**

1.1 Each party (**Indemnifying Party**) indemnifies the other party (**Indemnified Party**) against all Losses arising from or in connection with:
    (a) any breach of this Agreement by the Indemnifying Party;
    (b) any negligent or wrongful act or omission of the Indemnifying Party; or
    (c) any claim by a third party arising from the Indemnifying Party's performance of its obligations.

1.2 The Indemnifying Party's liability under this clause is reduced proportionally to the extent that any act or omission of the Indemnified Party caused or contributed to the Loss.

1.3 A party seeking indemnification must:
    (a) promptly notify the Indemnifying Party of the claim;
    (b) give the Indemnifying Party reasonable assistance; and
    (c) not make any admission or settlement without consent.`,
  },

  // -------------------------------------------------------------------------
  // LIMITATION OF LIABILITY CLAUSES
  // -------------------------------------------------------------------------
  limitation: {
    standard: `**Limitation of Liability**

1.1 To the maximum extent permitted by law, a party's total aggregate liability under or in connection with this Agreement, whether in contract, tort (including negligence), statute or otherwise, is limited to the greater of:
    (a) [AMOUNT]; or
    (b) the total Fees paid or payable under this Agreement in the 12 months preceding the claim.

1.2 Neither party is liable for any:
    (a) loss of revenue, profit, data, goodwill or anticipated savings;
    (b) indirect, special or consequential loss; or
    (c) loss arising from circumstances beyond its reasonable control,
    even if advised of the possibility of such loss.

1.3 Nothing in this Agreement excludes or limits liability:
    (a) for fraud or fraudulent misrepresentation;
    (b) for death or personal injury caused by negligence;
    (c) under an indemnity in this Agreement; or
    (d) which cannot be excluded or limited by law.`,

    cap_with_carveouts: `**Limitation of Liability**

1.1 **General Cap**: Subject to clauses 1.2 and 1.3, a party's total aggregate liability under this Agreement is limited to [AMOUNT].

1.2 **Excluded Claims**: The cap in clause 1.1 does not apply to:
    (a) breach of confidentiality obligations;
    (b) infringement of intellectual property rights;
    (c) amounts payable under an indemnity;
    (d) a party's payment obligations; or
    (e) fraud or wilful misconduct.

1.3 **Consequential Loss**: Neither party is liable for indirect, special, incidental or consequential loss, loss of profit, loss of data, loss of revenue, or loss of anticipated savings, except:
    (a) where such loss is reasonably foreseeable; or
    (b) as provided under an indemnity.

1.4 **Consumer Law**: Nothing in this Agreement limits rights under the Australian Consumer Law that cannot be excluded.`,
  },

  // -------------------------------------------------------------------------
  // TERMINATION CLAUSES
  // -------------------------------------------------------------------------
  termination: {
    for_convenience: `**Termination for Convenience**

1.1 Either party may terminate this Agreement for any reason by giving [NUMBER] days' written notice to the other party.

1.2 On termination for convenience:
    (a) the Client must pay for all Services performed up to the termination date;
    (b) the Provider must deliver all work product completed to date; and
    (c) neither party is liable for loss of anticipated profits or benefits.`,

    for_cause: `**Termination for Cause**

1.1 A party may terminate this Agreement immediately by written notice if the other party:
    (a) commits a material breach that is not remedied within [NUMBER] days of receiving written notice of the breach;
    (b) commits a material breach that is incapable of remedy;
    (c) becomes insolvent, enters administration, has a receiver appointed, or is wound up; or
    (d) ceases or threatens to cease carrying on business.

1.2 Termination does not affect any rights or remedies that have accrued before termination.`,

    combined: `**Termination**

1.1 **Termination for Convenience**: Either party may terminate this Agreement by giving [NUMBER] days' written notice.

1.2 **Termination for Breach**: A party may terminate immediately if the other party:
    (a) commits a material breach and fails to remedy it within 14 days of notice; or
    (b) commits a material breach incapable of remedy.

1.3 **Termination for Insolvency**: A party may terminate immediately if the other party:
    (a) is or becomes insolvent;
    (b) has an administrator, receiver or liquidator appointed; or
    (c) enters into an arrangement with creditors.

1.4 **Effect of Termination**: On termination:
    (a) all rights and licences granted terminate;
    (b) each party must return the other's Confidential Information;
    (c) accrued rights and obligations survive; and
    (d) clauses [X, Y, Z] survive termination.`,
  },

  // -------------------------------------------------------------------------
  // INTELLECTUAL PROPERTY CLAUSES
  // -------------------------------------------------------------------------
  ip: {
    client_owns_deliverables: `**Intellectual Property**

1.1 **Background IP**: Each party retains ownership of its Background IP. **Background IP** means intellectual property owned by a party before this Agreement or developed independently.

1.2 **Deliverables**: All intellectual property in the Deliverables vests in the Client on creation, or is assigned to the Client with full title guarantee on payment of Fees.

1.3 **Provider IP**: The Provider grants the Client a perpetual, non-exclusive, royalty-free licence to use any Provider Background IP incorporated in the Deliverables.

1.4 **Moral Rights**: The Provider warrants that it has obtained all necessary moral rights consents.`,

    provider_retains: `**Intellectual Property**

1.1 **Provider Ownership**: The Provider retains all intellectual property rights in:
    (a) the Deliverables;
    (b) all tools, methodologies and know-how used in creating the Deliverables; and
    (c) any modifications or improvements to the foregoing.

1.2 **Client Licence**: Subject to payment, the Provider grants the Client a non-exclusive, perpetual, royalty-free licence to use the Deliverables for the Client's internal business purposes.

1.3 **Restrictions**: The Client must not:
    (a) sublicense the Deliverables without consent;
    (b) reverse engineer the Deliverables; or
    (c) use the Deliverables to provide services to third parties.`,
  },

  // -------------------------------------------------------------------------
  // DISPUTE RESOLUTION CLAUSES
  // -------------------------------------------------------------------------
  disputes: {
    negotiation_then_court: `**Dispute Resolution**

1.1 If a dispute arises out of or in connection with this Agreement (**Dispute**), a party must not commence court proceedings unless it has complied with this clause.

1.2 A party claiming a Dispute has arisen must give written notice to the other party specifying the nature of the Dispute.

1.3 Within 14 days of receipt of a notice, senior representatives of each party must meet and attempt in good faith to resolve the Dispute.

1.4 If the Dispute is not resolved within 28 days of the notice, either party may commence court proceedings.

1.5 This clause does not prevent a party seeking urgent injunctive or declaratory relief.`,

    mediation: `**Dispute Resolution**

1.1 The parties agree to attempt to resolve any Dispute through the following process:
    (a) **Negotiation**: Senior representatives must meet within 14 days to negotiate in good faith;
    (b) **Mediation**: If not resolved within 28 days, the Dispute must be referred to mediation administered by the Australian Disputes Centre in accordance with its Mediation Rules;
    (c) **Litigation**: If not resolved within 60 days of commencement of mediation, either party may commence proceedings.

1.2 The costs of mediation are shared equally. Each party bears its own legal costs.

1.3 Nothing in this clause prevents a party seeking urgent interlocutory relief.`,

    arbitration: `**Dispute Resolution**

1.1 Any dispute, controversy or claim arising out of or in connection with this Agreement, including any question regarding its existence, validity or termination (**Dispute**), must be resolved by arbitration.

1.2 The arbitration will be:
    (a) administered by the Australian Centre for International Commercial Arbitration (ACICA) under the ACICA Arbitration Rules;
    (b) conducted in [CITY], Australia;
    (c) conducted in English; and
    (d) determined by a single arbitrator appointed by agreement or by ACICA.

1.3 The arbitrator's decision is final and binding. Judgment on the award may be entered in any court of competent jurisdiction.`,
  },

  // -------------------------------------------------------------------------
  // FORCE MAJEURE CLAUSES
  // -------------------------------------------------------------------------
  force_majeure: {
    standard: `**Force Majeure**

1.1 Neither party is liable for any delay or failure to perform its obligations (other than payment obligations) to the extent such delay or failure is caused by a Force Majeure Event.

1.2 **Force Majeure Event** means an event beyond the reasonable control of a party, including:
    (a) act of God, fire, flood, earthquake or natural disaster;
    (b) war, terrorism, civil unrest or armed conflict;
    (c) epidemic, pandemic or quarantine restrictions;
    (d) government act, law or regulation; or
    (e) failure of telecommunications or power supply.

1.3 The affected party must:
    (a) notify the other party promptly of the Force Majeure Event;
    (b) use reasonable endeavours to mitigate the effect; and
    (c) resume performance as soon as reasonably practicable.

1.4 If a Force Majeure Event continues for more than [NUMBER] days, either party may terminate by written notice.`,
  },
};

// ============================================================================
// RESPONSE EXAMPLES - Patterns for different modes
// ============================================================================

export const RESPONSE_EXAMPLES = {
  // -------------------------------------------------------------------------
  // CONTRACT ANALYSIS EXAMPLES
  // -------------------------------------------------------------------------
  contract_analysis: {
    risk_assessment: `**Limitation of Liability - HIGH RISK**

- **Location**: Clause 12.1
- **Issue**: Uncapped liability for the Client
- **Analysis**: 
  1. The clause limits the Supplier's liability to fees paid in the prior 12 months
  2. However, there is no reciprocal cap on the Client's liability
  3. The carve-outs for indemnities effectively uncap Supplier claims
  4. This creates asymmetric risk - the Supplier has downside protection, the Client does not
  5. Market practice is typically mutual caps or uncapped indemnities for both parties
- **Quote**: "The Supplier's total liability shall not exceed the Fees paid in the 12 month period preceding the claim"
- **Recommendation**: 
  - Request a mutual liability cap
  - Alternatively, seek a separate higher cap for Client liability (e.g., 2x contract value)
  - Include the Client's indemnity claims within the cap structure`,

    missing_clause: `**Missing Clause: Audit Rights**

For a software licensing agreement of this value, we would typically expect audit rights provisions, including:
- Right to audit Licensee's usage of the software
- Reasonable notice period for audits (e.g., 30 days)
- Frequency limitations (e.g., not more than once per year)
- Confidentiality of audit findings
- Cost allocation (typically auditor costs borne by Licensor unless material breach found)

**Recommendation**: Request the addition of standard audit rights provisions to protect the Licensor's interests and verify compliance with licence terms.`,
  },

  // -------------------------------------------------------------------------
  // LEGAL RESEARCH EXAMPLES
  // -------------------------------------------------------------------------
  legal_research: {
    irac_analysis: `### Issue
Whether a contractual limitation of liability clause that excludes liability for "consequential loss" prevents recovery for loss of profits that were within the reasonable contemplation of the parties at the time of contracting.

### Rule
The leading Australian authority is *Environmental Systems Pty Ltd v Peerless Holdings Pty Ltd* (2008) 19 VR 358 (Peerless), where the Victorian Court of Appeal held that:

1. "Consequential loss" has acquired a settled legal meaning derived from *Hadley v Baxendale* (1854) 9 Exch 341
2. It refers to loss falling within the second limb of *Hadley v Baxendale* - losses arising from special circumstances communicated to the breaching party
3. Loss of profits can be either direct or consequential depending on whether it arises naturally (first limb) or from special circumstances (second limb)

See also: *Allianz Australia Insurance Ltd v Waterbrook at Yowie Bay Pty Ltd* [2009] NSWCA 224 at [117]-[120].

### Application
Applying *Peerless* to the present facts:
- The loss of profits arose naturally from the breach (failure to deliver goods for resale)
- No special circumstances were communicated to make this "consequential"
- Therefore, this is first limb loss and is NOT excluded by the limitation clause

### Conclusion
**High Confidence**: The limitation clause does not exclude liability for the lost profits. The client may recover these losses subject to proving quantum and that they were not too remote.

### Key Authorities
- *Environmental Systems Pty Ltd v Peerless Holdings Pty Ltd* (2008) 19 VR 358
- *Hadley v Baxendale* (1854) 9 Exch 341
- *Allianz Australia Insurance Ltd v Waterbrook at Yowie Bay Pty Ltd* [2009] NSWCA 224`,
  },

  // -------------------------------------------------------------------------
  // COMPLIANCE EXAMPLES
  // -------------------------------------------------------------------------
  compliance: {
    gap_analysis: `#### Privacy Act 1988 (Cth) - Australian Privacy Principle 11

**Requirement**: APP 11 requires organisations to take reasonable steps to protect personal information from misuse, interference, loss, and unauthorised access, modification or disclosure.

**Current State**: 
- Data encryption at rest: Implemented (AES-256)
- Data encryption in transit: Implemented (TLS 1.3)
- Access controls: Role-based access implemented
- Security incident response plan: Not documented
- Regular security training: Not evidenced

**Gap Assessment**:
| Aspect | Required | Actual | Status |
|--------|----------|--------|--------|
| Encryption at rest | Yes | AES-256 | Compliant |
| Encryption in transit | Yes | TLS 1.3 | Compliant |
| Access controls | Yes | RBAC | Compliant |
| Incident response | Yes | None documented | GAP |
| Staff training | Yes | Not evidenced | GAP |

**Compliance Status**: Partial

**Risk if Non-Compliant**:
- Regulatory: Civil penalties up to $2.5M per breach (increased penalties apply from December 2022)
- Reputational: Loss of customer trust, media exposure
- Operational: Potential enforcement undertakings requiring systems changes
- Legal: Increased exposure in data breach litigation

**Remediation Actions**:
1. Develop and implement Security Incident Response Plan - Priority: High - Timeline: 30 days
2. Implement annual privacy and security awareness training - Priority: High - Timeline: 60 days
3. Document evidence of all security measures for compliance records - Priority: Medium - Timeline: 45 days`,
  },
};

// ============================================================================
// DOCUMENT TEMPLATES - Starting structures for common documents
// ============================================================================

export const DOCUMENT_TEMPLATES = {
  nda_mutual: {
    name: "Mutual Non-Disclosure Agreement",
    structure: [
      "Parties",
      "Background",
      "Definitions",
      "Confidential Information",
      "Obligations of Receiving Party",
      "Permitted Disclosures",
      "Return of Information",
      "Term and Termination",
      "Remedies",
      "General Provisions",
      "Execution",
    ],
  },
  services_agreement: {
    name: "Services Agreement",
    structure: [
      "Parties",
      "Background",
      "Definitions and Interpretation",
      "Appointment and Services",
      "Term",
      "Fees and Payment",
      "Warranties",
      "Intellectual Property",
      "Confidentiality",
      "Limitation of Liability",
      "Indemnity",
      "Termination",
      "Dispute Resolution",
      "General Provisions",
      "Execution",
      "Schedule 1 - Services",
      "Schedule 2 - Fees",
    ],
  },
  employment_contract: {
    name: "Employment Contract",
    structure: [
      "Parties",
      "Position and Duties",
      "Term",
      "Remuneration and Benefits",
      "Hours of Work",
      "Leave Entitlements",
      "Confidentiality",
      "Intellectual Property",
      "Restraints",
      "Termination",
      "Return of Property",
      "General Provisions",
      "Execution",
    ],
  },
  software_licence: {
    name: "Software Licence Agreement",
    structure: [
      "Parties",
      "Background",
      "Definitions",
      "Grant of Licence",
      "Licence Restrictions",
      "Fees",
      "Support and Maintenance",
      "Intellectual Property",
      "Confidentiality",
      "Warranties",
      "Limitation of Liability",
      "Indemnity",
      "Term and Termination",
      "Effects of Termination",
      "General Provisions",
      "Execution",
    ],
  },
};

// ============================================================================
// CITATION FORMATS - Australian legal citation standards
// ============================================================================

export const CITATION_FORMATS = {
  // Case law citation formats (AGLC4)
  cases: {
    reported: "{Case Name} ({Year}) {Volume} {Report Series} {Page}",
    unreported:
      "{Case Name} [{Year}] {Court Identifier} {Judgment Number}",
    examples: [
      "*Mabo v Queensland (No 2)* (1992) 175 CLR 1",
      "*Australian Competition and Consumer Commission v Valve Corporation (No 3)* [2016] FCA 196",
    ],
  },
  // Legislation citation formats
  legislation: {
    act: "{Act Name} {Year} ({Jurisdiction}) {section}",
    regulation:
      "{Regulation Name} {Year} ({Jurisdiction}) {regulation}",
    examples: [
      "Corporations Act 2001 (Cth) s 180",
      "Privacy Regulation 2013 (Cth) reg 5.1",
    ],
  },
  // Jurisdiction abbreviations
  jurisdictions: {
    Cth: "Commonwealth",
    NSW: "New South Wales",
    Vic: "Victoria",
    Qld: "Queensland",
    WA: "Western Australia",
    SA: "South Australia",
    Tas: "Tasmania",
    ACT: "Australian Capital Territory",
    NT: "Northern Territory",
  },
};


