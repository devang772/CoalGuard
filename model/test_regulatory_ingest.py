from app.ai.regulatory_ingest import extract_rules_from_pdf
from app.ai.regulatory_store import save_rules

PDF_PATH = "tests/data/Coal_Mines_Regulations_sample.pdf"

def main():

    print("Reading PDF...")

    rules = extract_rules_from_pdf(
        PDF_PATH
    )

    print(
        f"\nExtracted {len(rules)} rules.\n"
    )
    for rule in rules:
        print("=" * 80)
        print(
            f"ID: {rule['rule_id']}"
        )
        print(
            f"Title: {rule['title']}"
        )
        print(
            f"Source: "
            f"{rule['source_document']} "
            f"(page {rule['source_page']})"
        )
        print(
            f"Category: {rule['category']}"
        )
        print(
            f"Frequency: {rule['frequency']}"
        )
        print(
            f"Mine types: "
            f"{rule['mine_types']}"
        )
        print(
            f"Inspection types: "
            f"{rule['inspection_types']}"
        )
        print(
            f"Responsible: "
            f"{rule['responsible_role']}"
        )

        print(
            f"\nSource:\n"
            f"{rule['source_text']}"
        )

    # Uncomment once output looks correct.
    # saved = save_rules(rules)
    # print(f"Saved {saved} rules.")

if __name__ == "__main__":
    main()
