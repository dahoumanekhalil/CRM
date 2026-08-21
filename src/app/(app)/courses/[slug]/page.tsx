import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourseDetail } from "../actions";
import { CourseHeader } from "./course-header";
import { CourseTabsView } from "./course-tabs";
import { LandingPagesTab } from "./landing-pages-tab";
import { SessionsTab } from "./sessions-tab";
import { RegistrationsTab } from "./registrations-tab";
import { CourseActivityTab } from "./activity-tab";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCourseDetail(slug);
  return {
    title: data?.course.name ?? "Course",
    description:
      data?.course.summary ?? "Course details, sessions and landing pages.",
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const data = await getCourseDetail(slug);
  if (!data) notFound();

  return (
    <>
      <CourseHeader detail={data} />
      <div className="flex-1 p-6">
        <CourseTabsView
          detail={data}
          sessionsSlot={
            <SessionsTab
              courseId={data.course.id}
              courseSlug={slug}
              courseName={data.course.name}
            />
          }
          studentsSlot={
            <RegistrationsTab
              courseId={data.course.id}
              activeRegistrations={data.activeRegistrations}
              totalCapacity={data.totalCapacity}
            />
          }
          landingPagesSlot={
            <LandingPagesTab
              courseId={data.course.id}
              courseName={data.course.name}
            />
          }
          activitySlot={<CourseActivityTab courseId={data.course.id} />}
        />
      </div>
    </>
  );
}
