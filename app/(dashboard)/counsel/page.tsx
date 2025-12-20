import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, Plus } from "lucide-react";
import { getConversations, createConversation } from "@/actions/conversations";

export default async function CounselPage() {
  const conversations = await getConversations();

  async function handleNewConversation() {
    "use server";
    const result = await createConversation();
    if (result.success) {
      redirect(`/counsel/${result.data.id}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Counsel</h1>
          <p className="text-muted-foreground">
            AI-powered legal research and document analysis
          </p>
        </div>
        <form action={handleNewConversation}>
          <Button variant="gradient" type="submit">
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </form>
      </div>

      {/* Conversation List */}
      {conversations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={`/counsel/${conversation.id}`}>
              <Card className="h-full hover:shadow-glow-sm transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">
                        {conversation.title}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription>
                    {new Date(conversation.updated_at).toLocaleDateString(
                      "en-AU",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1" />
            </div>
            <h3 className="text-lg font-medium mb-2">Start Your First Conversation</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Ask Counsel questions about Australian law, analyse documents,
              or get help with drafting legal documents.
            </p>
            <form action={handleNewConversation}>
              <Button variant="gradient" type="submit">
                <Plus className="mr-2 h-4 w-4" />
                New Conversation
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Capabilities Card */}
      <Card>
        <CardHeader>
          <CardTitle>What Counsel Can Do</CardTitle>
          <CardDescription>
            Powered by advanced AI with legal-specific capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Document Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Upload contracts and legal documents for AI-powered analysis and
                extraction of key terms.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Legal Research</h4>
              <p className="text-sm text-muted-foreground">
                Ask questions about Australian law and receive answers with
                citations to relevant sources.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Document Drafting</h4>
              <p className="text-sm text-muted-foreground">
                Generate drafts of legal documents based on your requirements
                and matter context.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Matter Summaries</h4>
              <p className="text-sm text-muted-foreground">
                Get comprehensive summaries of your matters and document
                collections.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

