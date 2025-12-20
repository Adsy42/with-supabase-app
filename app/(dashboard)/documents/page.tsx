import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Browse and manage your document library
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            Documents are uploaded within matters. Create a matter first, then
            upload documents to it.
          </p>
          <Button variant="outline" disabled>
            <Upload className="mr-2 h-4 w-4" />
            Upload Documents
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported Document Types</CardTitle>
          <CardDescription>
            Orderly supports a variety of legal document formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">PDF</p>
                <p className="text-xs text-muted-foreground">
                  Contracts, briefs, filings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">DOCX</p>
                <p className="text-xs text-muted-foreground">
                  Word documents, drafts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">TXT</p>
                <p className="text-xs text-muted-foreground">
                  Plain text files
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



