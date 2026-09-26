import type React from 'react';

export const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-5 rounded-3xl bg-background-dark p-6 shadow-xl">
    <div className="flex flex-col gap-[3px] border-line border-b pb-3.5">
      <h2 className="font-figtree font-semibold text-[19px] text-primary leading-[1.2]">
        {title}
      </h2>
      {description && <p className="text-[13px] text-subtle">{description}</p>}
    </div>
    <div className="flex flex-col gap-[18px]">{children}</div>
  </section>
);
