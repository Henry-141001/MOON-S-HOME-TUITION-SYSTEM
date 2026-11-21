import { prisma } from "@/lib/prisma";
import { getStudentRecords } from "@/lib/records";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { ConfirmButton, InlineAction } from "@/components/forms";
import { CommentsList, LatestCommentsByCategory } from "@/components/records";
import { ReplyForm } from "@/components/reply-form";
import { parentDeleteOwnReply, parentReplyToComment } from "../_actions";
import { getParentView, NoChildLinked } from "../_view";

export const metadata = { title: "Ulasan Guru" };

export default async function ParentCommentsPage({ searchParams }: PageProps<"/ibu-bapa/ulasan">) {
  const { parent, child, readOnly } = await getParentView(searchParams);
  if (!child) return <NoChildLinked />;
  const r = await getStudentRecords(child.id, { audience: "parent" });

  // The parent has now seen the teacher's new replies (still marked "Baharu" on this visit).
  // The read-only observer never changes anything.
  const hasNew = r.comments.some((c) => c.replies.some((x) => !x.fromParent && x.unread));
  if (hasNew && !readOnly) {
    await prisma.commentReply.updateMany({
      where: { authorType: "ADMIN", readAt: null, comment: { studentId: child.id, isPublished: true } },
      data: { readAt: new Date() },
    });
  }

  return (
    <>
      <PageHeader title="Ulasan Guru" description={`Maklum balas guru tentang perkembangan ${child.fullName}.`} />
      <Card>
        <CardHeader title="Ulasan Terkini Mengikut Kategori" />
        <CardBody>
          <LatestCommentsByCategory comments={r.comments} />
        </CardBody>
      </Card>
      <Card className="mt-6">
        <CardHeader
          title="Semua Ulasan"
          description="Terbaru dahulu · tekan “Balas” untuk bertanya atau memberi maklum balas kepada guru"
        />
        <CardBody>
          <CommentsList
            comments={r.comments}
            viewer="parent"
            renderReplyForm={(c) => (
              <ReplyForm action={parentReplyToComment.bind(null, c.id)} placeholder="Tulis balasan kepada guru…" />
            )}
            renderReplyActions={(_c, reply) =>
              reply.fromParent && reply.parentId === parent.id ? (
                <InlineAction action={parentDeleteOwnReply.bind(null, reply.id)}>
                  <ConfirmButton variant="ghost" size="xs" message="Padam balasan anda?">
                    Padam
                  </ConfirmButton>
                </InlineAction>
              ) : null
            }
          />
        </CardBody>
      </Card>
    </>
  );
}
