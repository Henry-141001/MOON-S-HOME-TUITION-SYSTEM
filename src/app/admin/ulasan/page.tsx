import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { formatDate, todayISO, toISODate } from "@/lib/dates";
import { COMMENT_LABELS } from "@/lib/constants";
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, PageHeader, RowChevron, cn } from "@/components/ui";
import { ConfirmButton, InlineAction, Modal } from "@/components/forms";
import { CommentsList, StudentAvatar } from "@/components/records";
import { createComment, deleteComment, setCommentPublished, updateComment } from "@/app/admin/_actions/comments";
import { CommentForm } from "./comment-form";

export const metadata = { title: "Ulasan Guru" };

export default async function CommentsPage({ searchParams }: PageProps<"/admin/ulasan">) {
  await requireAdminView();
  const sp = await searchParams;
  const studentId = typeof sp.murid === "string" ? sp.murid : "";

  const students = await prisma.student.findMany({
    where: { OR: [{ isActive: true }, ...(studentId ? [{ id: studentId }] : [])] },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      photo: { select: { updatedAt: true } },
      _count: { select: { comments: true } },
    },
  });
  const selected = students.find((s) => s.id === studentId) ?? null;

  const comments = selected
    ? await prisma.teacherComment.findMany({
        where: { studentId: selected.id },
        orderBy: [{ commentDate: "desc" }, { createdAt: "desc" }],
        select: { id: true, category: true, content: true, commentDate: true, isPublished: true },
      })
    : [];
  const recent = selected
    ? []
    : await prisma.teacherComment.findMany({
        where: { student: { isActive: true } },
        orderBy: [{ commentDate: "desc" }, { createdAt: "desc" }],
        take: 10,
        select: { id: true, category: true, content: true, commentDate: true, isPublished: true, student: { select: { id: true, fullName: true } } },
      });

  return (
    <>
      <PageHeader title="Ulasan Guru" description="Maklum balas peribadi tentang perkembangan setiap murid kepada ibu bapa." />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Pilih Murid" />
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/ulasan?murid=${s.id}`}
                  aria-current={s.id === selected?.id ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 hover:bg-beige-50 active:bg-beige-100",
                    s.id === selected?.id && "bg-navy-50 shadow-[inset_3px_0_0_var(--color-navy-600)]",
                  )}
                >
                  <StudentAvatar studentId={s.id} name={s.fullName} photoVersion={s.photo?.updatedAt} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{s.fullName}</span>
                    <span className="text-xs text-muted">
                      {s.studentCode} · {s._count.comments} ulasan
                    </span>
                  </span>
                  <RowChevron />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {selected ? (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title={`Ulasan Baharu untuk ${selected.fullName}`}
                icon={<MessageSquarePlus className="size-4" />}
                actions={
                  <ButtonLink href={`/admin/murid/${selected.id}`} variant="ghost" size="sm" arrow>
                    Profil murid
                  </ButtonLink>
                }
              />
              <CardBody>
                <CommentForm
                  key={selected.id}
                  action={createComment.bind(null, selected.id)}
                  defaults={{ commentDate: todayISO() }}
                  submitLabel="Simpan Ulasan"
                  resetOnSuccess
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Semua Ulasan" description={`${comments.length} ulasan · terbaru dahulu`} />
              <CardBody>
                <CommentsList
                  comments={comments.map((c) => ({ ...c, commentDate: toISODate(c.commentDate) }))}
                  renderActions={(c) => (
                    <>
                      <Modal trigger="Edit" triggerVariant="ghost" triggerSize="sm" title="Kemas Kini Ulasan">
                        <CommentForm
                          action={updateComment.bind(null, c.id)}
                          defaults={{ category: c.category, content: c.content, commentDate: c.commentDate, isPublished: c.isPublished }}
                          submitLabel="Simpan Perubahan"
                        />
                      </Modal>
                      <InlineAction action={setCommentPublished.bind(null, c.id, !c.isPublished)}>
                        <ConfirmButton
                          variant="ghost"
                          message={c.isPublished ? "Sembunyikan ulasan ini daripada ibu bapa?" : "Terbitkan ulasan ini kepada ibu bapa?"}
                        >
                          {c.isPublished ? "Sembunyikan" : "Terbitkan"}
                        </ConfirmButton>
                      </InlineAction>
                      <InlineAction action={deleteComment.bind(null, c.id)}>
                        <ConfirmButton message="Padam ulasan ini secara kekal?">Padam</ConfirmButton>
                      </InlineAction>
                    </>
                  )}
                />
              </CardBody>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader title="Ulasan Terkini" description="Pilih murid di sebelah untuk menulis ulasan baharu." />
            {recent.length === 0 ? (
              <EmptyState title="Belum ada ulasan" description="Pilih seorang murid untuk mula menulis ulasan." />
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/ulasan?murid=${c.student.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-beige-50 active:bg-beige-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink">{c.student.fullName}</p>
                          <span className="flex items-center gap-2 text-xs text-muted">
                            {!c.isPublished && <Badge tone="neutral">Draf</Badge>}
                            {formatDate(c.commentDate)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-navy-700">{COMMENT_LABELS[c.category]}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{c.content}</p>
                      </div>
                      <RowChevron />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
