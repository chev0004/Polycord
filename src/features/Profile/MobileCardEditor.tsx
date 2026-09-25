'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useMemo, useState } from 'react';
import {
  Controller,
  type FieldErrors,
  type UseFormReturn,
} from 'react-hook-form';
import type { IconType } from 'react-icons';
import {
  MdAdd,
  MdArrowBack,
  MdDeleteOutline,
  MdEdit,
  MdGraphicEq,
  MdLocationOn,
  MdMic,
  MdMoreVert,
  MdOutlineSchedule,
  MdPalette,
  MdPublic,
  MdSell,
  MdTouchApp,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FieldError, TextArea, TextInput, Toggle } from '@/components/Form';
import {
  ActionSheet,
  type ActionSheetItem,
  Sheet,
  SheetDrill,
  SheetGroup,
  SheetIconButton,
  SheetLabel,
  SheetPickList,
  SheetRow,
  SheetTextButton,
} from '@/components/Sheet';
import {
  countryOptions,
  getLanguageName,
  getProficiencyTranslationKey,
  languageOptions,
  proficiencyOptions,
} from '@/constants';
import { type DiscoveryProfile, ProfileCard } from '@/features/Discovery';
import { AvailabilityRow } from '@/features/Discovery/AvailabilityRow';
import {
  type CardTheme,
  deriveCardAccent,
  FREE_ACCENT,
} from '@/features/Discovery/cardTheme';
import { SettingsToggleRow } from '@/features/Settings/MobileSettings';
import { BIO_MAX } from '@/lib/profileFields';
import {
  FREE_LANGUAGE_CAP,
  PREMIUM_LANGUAGE_CAP,
  type ProfileFormValues,
} from './schema';
import { createEmptyLanguageRow } from './TargetLanguagesEditor';

type EditorSheet =
  | 'style'
  | 'name'
  | 'languages'
  | 'voice'
  | 'availability'
  | 'tags'
  | 'location'
  | 'privacy'
  | 'menu';

type LanguagePick = { kind: 'primary' } | { kind: 'target'; index: number };

type MobileCardEditorProps = {
  form: UseFormReturn<ProfileFormValues>;
  onSubmit: (data: ProfileFormValues) => Promise<void>;
  onDiscard: () => void;
  onStyleClose: () => void;
  premium: boolean;
  premiumLook: boolean;
  theme: CardTheme;
  displayName: string;
  userAvatarUrl?: string;
  previewProfile: DiscoveryProfile;
  statusMessage: ReactNode;
  draftNotice: ReactNode;
  menuItems: ActionSheetItem[];
  cardStylePicker: ReactNode;
  voiceEditor: ReactNode;
  availabilityEditor: ReactNode;
  tagEditor: ReactNode;
};

const Zone = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="-m-1 relative rounded-lg p-1 text-left outline-dashed outline-1 outline-[rgba(193,213,233,0.28)] transition-colors duration-200 active:bg-overlay active:outline-primary"
  >
    {children}
    <span
      aria-hidden
      className="-top-[9px] -right-[9px] absolute z-[2] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_0_0_3px_var(--color-background-dark)]"
    >
      <MdEdit size={13} />
    </span>
  </button>
);

const Ghost = ({
  icon: Icon,
  label,
  tag,
  onClick,
}: {
  icon: IconType;
  label: string;
  tag?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-primary-dark border-dashed px-3 text-left font-semibold text-[13px] text-muted active:bg-overlay"
  >
    <Icon size={18} aria-hidden className="flex-shrink-0 text-primary" />
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {tag ? (
      <span className="rounded bg-primary-darker px-1.5 py-0.5 font-bold text-[10px] text-primary-light uppercase tracking-[0.04em]">
        {tag}
      </span>
    ) : null}
  </button>
);

const footerButton = (label: string, onClick: () => void) => (
  <Button
    weight="semibold"
    onClick={onClick}
    className="h-[50px] flex-1 rounded-full text-[15px]"
  >
    {label}
  </Button>
);

export const MobileCardEditor = ({
  form,
  onSubmit,
  onDiscard,
  onStyleClose,
  premium,
  premiumLook,
  theme,
  displayName,
  userAvatarUrl,
  previewProfile,
  statusMessage,
  draftNotice,
  menuItems,
  cardStylePicker,
  voiceEditor,
  availabilityEditor,
  tagEditor,
}: MobileCardEditorProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const {
    control,
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = form;
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [sheet, setSheet] = useState<EditorSheet | null>(null);
  const [bioEditing, setBioEditing] = useState(false);
  const [languagePick, setLanguagePick] = useState<LanguagePick | null>(null);
  const [countryPicking, setCountryPicking] = useState(false);

  const values = watch();
  const targetLanguages = values.targetLanguages ?? [];
  const tags = values.tags ?? [];
  const voiceSeconds = values.voiceIntroSeconds ?? 0;
  const languageCap = premium ? PREMIUM_LANGUAGE_CAP : FREE_LANGUAGE_CAP;
  const allLanguages = useMemo(() => languageOptions(locale), [locale]);
  const levels = useMemo(() => proficiencyOptions(locale), [locale]);
  const countries = useMemo(() => countryOptions(locale), [locale]);
  const countryLabel = countries.find(
    (option) => option.value === values.country,
  )?.label;
  const cardStyle = deriveCardAccent(premiumLook ? theme.accent : FREE_ACCENT);

  const closeSheet = () => {
    if (sheet === 'style') onStyleClose();
    cancelPick();
    setSheet(null);
  };

  const openSheet = (next: EditorSheet) => {
    setLanguagePick(null);
    setCountryPicking(false);
    setSheet(next);
  };

  const setTargets = (rows: ProfileFormValues['targetLanguages']) =>
    setValue('targetLanguages', rows, {
      shouldDirty: true,
      shouldValidate: true,
    });

  const languageLabel = (code: string, level?: string) =>
    `${getLanguageName(code, locale)}${
      level ? ` / ${t(getProficiencyTranslationKey(level))}` : ''
    }`;

  const finishBio = async () => {
    if (await trigger('bio')) setBioEditing(false);
  };

  const onInvalid = (invalid: FieldErrors<ProfileFormValues>) => {
    setMode('edit');
    if (invalid.primaryLanguage || invalid.targetLanguages)
      openSheet('languages');
    else if (invalid.bio) setBioEditing(true);
    else if (invalid.country || invalid.timezone) openSheet('location');
    else if (invalid.tags) openSheet('tags');
  };

  const targetError = Array.isArray(errors.targetLanguages)
    ? errors.targetLanguages.find(Boolean)?.language?.message
    : errors.targetLanguages?.message;

  const pickOptions =
    languagePick?.kind === 'primary'
      ? allLanguages.filter(
          (option) =>
            !targetLanguages.some((row) => row.language === option.value),
        )
      : allLanguages.filter(
          (option) =>
            option.value ===
              (languagePick
                ? targetLanguages[languagePick.index]?.language
                : '') ||
            (option.value !== values.primaryLanguage &&
              !targetLanguages.some((row) => row.language === option.value)),
        );

  const cancelPick = () => {
    if (
      languagePick?.kind === 'target' &&
      !targetLanguages[languagePick.index]?.language
    )
      setTargets(
        targetLanguages.filter((_, index) => index !== languagePick.index),
      );
    setLanguagePick(null);
  };

  const pickLanguage = (code: string) => {
    if (!languagePick) return;
    if (languagePick.kind === 'primary') {
      setValue('primaryLanguage', code, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      setTargets(
        targetLanguages.map((row, index) =>
          index === languagePick.index ? { ...row, language: code } : row,
        ),
      );
    }
    setLanguagePick(null);
  };

  const hasLanguages =
    Boolean(values.primaryLanguage) ||
    targetLanguages.some((row) => row.language);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto w-full max-w-xl pb-24 font-figtree"
    >
      <div className="flex min-h-[52px] items-center justify-between gap-3 pt-1 pr-3 pb-2 pl-4">
        <h1 className="font-bold text-[28px] leading-tight tracking-[-0.01em]">
          {t('yourCard')}
        </h1>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => openSheet('privacy')}
            className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 font-semibold text-xs ${
              values.isPublic
                ? 'bg-primary-darker text-primary-light'
                : 'bg-overlay text-muted'
            }`}
          >
            {values.isPublic ? (
              <MdPublic size={15} aria-hidden />
            ) : (
              <MdVisibilityOff size={15} aria-hidden />
            )}
            {values.isPublic ? t('statusPublic') : t('statusUnlisted')}
          </button>
          <SheetIconButton
            label={t('profileOptions')}
            onClick={() => openSheet('menu')}
          >
            <MdMoreVert size={24} />
          </SheetIconButton>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-3">
        {draftNotice}
        {statusMessage}
        <div className="grid grid-cols-2 gap-[3px] rounded-full bg-background-darker p-[3px]">
          {(['edit', 'preview'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => {
                if (bioEditing) void finishBio();
                setMode(value);
              }}
              className={`h-9 rounded-full font-semibold text-[13px] transition-colors duration-200 ${
                mode === value
                  ? 'bg-primary-dark text-foreground'
                  : 'text-muted'
              }`}
            >
              {value === 'edit' ? t('modeEdit') : t('modePreview')}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          {mode === 'edit' ? (
            <MdTouchApp size={16} aria-hidden className="text-primary" />
          ) : (
            <MdVisibility size={16} aria-hidden className="text-primary" />
          )}
          {mode === 'edit' ? t('editHint') : t('previewHint')}
        </p>
      </div>

      <fieldset className="min-w-0 px-3">
        {mode === 'preview' ? (
          <ProfileCard
            profile={previewProfile}
            variant="preview"
            bioFallback={t('previewBioFallback')}
            emptyTagsLabel={t('previewNoTags')}
          />
        ) : (
          <article
            style={cardStyle}
            className="flex flex-col gap-5 rounded-3xl bg-background-dark p-[18px]"
          >
            <button
              type="button"
              aria-label={t('cardStyle')}
              onClick={() => openSheet('style')}
              className="-mx-[18px] -mt-[18px] flex h-[60px] items-end justify-end rounded-t-3xl px-2.5 pb-2"
              style={{ background: theme.banner }}
            >
              <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-black/40 px-2.5 font-semibold text-white text-xs">
                <MdPalette size={15} aria-hidden />
                {t('cardStyle')}
              </span>
            </button>
            <button
              type="button"
              aria-label={t('nameAndAvatar')}
              onClick={() => openSheet('name')}
              className="-mt-[55px] relative self-start rounded-full bg-background-dark p-[5px]"
            >
              <Avatar avatarUrl={userAvatarUrl} size="md" />
            </button>

            <Zone
              label={t('editPart', { part: t('nameAndAvatar') })}
              onClick={() => openSheet('name')}
            >
              <span className="block truncate font-semibold text-[19px]">
                {displayName}
              </span>
              <span className="mt-[3px] block text-muted text-xs">
                {t('nameSyncedHint')}
              </span>
            </Zone>

            {hasLanguages ? (
              <Zone
                label={t('editPart', { part: t('languagesTitle') })}
                onClick={() => openSheet('languages')}
              >
                <span className="flex flex-wrap gap-2">
                  {values.primaryLanguage ? (
                    <span className="rounded-full bg-[var(--ct-chip-bg,var(--color-primary-darker))] px-[11px] py-[5px] font-medium text-[var(--ct-chip-text,var(--color-foreground))] text-xs">
                      {getLanguageName(values.primaryLanguage, locale)}
                    </span>
                  ) : null}
                  {targetLanguages
                    .filter((row) => row.language)
                    .map((row) => (
                      <span
                        key={row.language}
                        className="rounded-full bg-background-darker px-[11px] py-[5px] font-medium text-soft text-xs"
                      >
                        {languageLabel(row.language, row.level)}
                      </span>
                    ))}
                </span>
              </Zone>
            ) : (
              <Ghost
                icon={MdAdd}
                label={t('addLanguages')}
                onClick={() => openSheet('languages')}
              />
            )}

            {premium && voiceSeconds > 0 ? (
              <Zone
                label={t('editPart', { part: t('voiceIntroTitle') })}
                onClick={() => openSheet('voice')}
              >
                <span className="inline-flex h-9 items-center gap-2 rounded-full bg-background-darker px-3.5 text-sm text-soft">
                  <MdGraphicEq
                    size={18}
                    aria-hidden
                    className="text-[var(--ct-accent,var(--color-primary))]"
                  />
                  {`0:${String(voiceSeconds).padStart(2, '0')}`}
                </span>
              </Zone>
            ) : (
              <Ghost
                icon={MdMic}
                label={t('addVoice')}
                tag={premium ? undefined : t('voiceIntroPremiumTag')}
                onClick={() => openSheet('voice')}
              />
            )}

            {values.availability ? (
              <Zone
                label={t('editPart', { part: t('freeTimeLabel') })}
                onClick={() => openSheet('availability')}
              >
                <AvailabilityRow
                  availability={values.availability}
                  ownerTimezone={values.timezone}
                />
              </Zone>
            ) : (
              <Ghost
                icon={MdOutlineSchedule}
                label={t('addFreeTime')}
                onClick={() => openSheet('availability')}
              />
            )}

            {tags.length > 0 ? (
              <Zone
                label={t('editPart', { part: t('tagsLabel') })}
                onClick={() => openSheet('tags')}
              >
                <span className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Chip key={tag} label={tag} />
                  ))}
                </span>
              </Zone>
            ) : (
              <Ghost
                icon={MdSell}
                label={t('addTags')}
                onClick={() => openSheet('tags')}
              />
            )}

            {bioEditing ? (
              <div className="flex flex-col gap-2">
                <TextArea
                  id="mobile-bio"
                  rows={4}
                  aria-label={t('bioLabel')}
                  placeholder={t('bioPlaceholder')}
                  error={Boolean(errors.bio)}
                  {...register('bio')}
                />
                {errors.bio ? (
                  <FieldError id="mobile-bio-error">
                    {t(errors.bio.message as string)}
                  </FieldError>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-subtle text-xs">
                    {t('bioCounter', {
                      count: values.bio.length,
                      max: BIO_MAX,
                    })}
                  </span>
                  <Button
                    weight="semibold"
                    onClick={() => void finishBio()}
                    className="h-10 rounded-full"
                  >
                    {t('done')}
                  </Button>
                </div>
              </div>
            ) : (
              <Zone
                label={t('editPart', { part: t('bioLabel') })}
                onClick={() => setBioEditing(true)}
              >
                <span
                  className={`block whitespace-pre-wrap break-words font-light text-sm leading-normal ${
                    values.bio ? 'text-soft' : 'text-muted'
                  }`}
                >
                  {values.bio || t('addBio')}
                </span>
              </Zone>
            )}

            {values.country ? (
              <Zone
                label={t('editPart', { part: t('locationTitle') })}
                onClick={() => openSheet('location')}
              >
                <span className="flex items-center gap-1.5 text-muted text-xs">
                  <MdLocationOn
                    size={16}
                    aria-hidden
                    className="flex-shrink-0 text-[var(--ct-accent,var(--color-primary))]"
                  />
                  {values.displayTimezone && values.timezone
                    ? `${countryLabel} · ${values.timezone}`
                    : countryLabel}
                </span>
              </Zone>
            ) : (
              <Ghost
                icon={MdLocationOn}
                label={t('addCountry')}
                onClick={() => openSheet('location')}
              />
            )}
          </article>
        )}

        {isDirty ? (
          <div className="fixed inset-x-2.5 bottom-[calc(var(--dock-space,0px)+12px)] z-[6] mx-auto flex max-w-xl items-center gap-2 rounded-full border border-line bg-background-darker py-2 pr-2 pl-[18px] shadow-lg">
            <span className="min-w-0 flex-1 font-semibold text-[13px] text-discord-yellow">
              {t('unsavedShort')}
            </span>
            <Button
              variant="outline"
              weight="semibold"
              onClick={() => {
                setBioEditing(false);
                onDiscard();
              }}
              disabled={isSubmitting}
              className="h-10 rounded-full"
            >
              {t('discard')}
            </Button>
            <Button
              type="submit"
              weight="semibold"
              disabled={isSubmitting}
              className="h-10 rounded-full"
            >
              {isSubmitting ? t('saving') : t('save')}
            </Button>
          </div>
        ) : null}
      </fieldset>

      <Sheet
        open={sheet === 'style'}
        onOpenChange={(open) => (open ? openSheet('style') : closeSheet())}
        title={t('cardStyle')}
        footer={footerButton(t('done'), closeSheet)}
      >
        {cardStylePicker}
      </Sheet>

      <Sheet
        open={sheet === 'name'}
        onOpenChange={(open) => (open ? openSheet('name') : closeSheet())}
        title={t('nameAndAvatar')}
      >
        <div className="flex flex-col items-center gap-2.5 pt-1 pb-2 text-center">
          <Avatar avatarUrl={userAvatarUrl} size="lg" />
          <p className="font-bold text-xl">{displayName}</p>
          <p className="max-w-[290px] text-[13px] text-muted leading-snug">
            {t('nameSheetDescription')}
          </p>
          <Button
            variant="discord"
            weight="semibold"
            onClick={() =>
              window.location.assign(`/api/auth/discord?locale=${locale}`)
            }
            className="mt-1.5 h-[50px] w-full rounded-full text-[15px]"
          >
            {t('updateConnection')}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={sheet === 'languages'}
        onOpenChange={(open) => (open ? openSheet('languages') : closeSheet())}
        full
        flush
        title={
          languagePick
            ? languagePick.kind === 'primary'
              ? t('primaryLanguageLabel')
              : t('chooseLanguage')
            : t('languagesTitle')
        }
        leading={
          languagePick ? (
            <SheetIconButton label={t('back')} onClick={cancelPick}>
              <MdArrowBack size={24} />
            </SheetIconButton>
          ) : undefined
        }
        footer={languagePick ? undefined : footerButton(t('done'), closeSheet)}
      >
        <SheetDrill
          drilled={Boolean(languagePick)}
          main={
            <>
              <SheetLabel>{t('primaryLanguageLabel')}</SheetLabel>
              <SheetGroup>
                <SheetRow
                  label={
                    values.primaryLanguage
                      ? getLanguageName(values.primaryLanguage, locale)
                      : t('chooseLanguage')
                  }
                  chevron
                  onClick={() => setLanguagePick({ kind: 'primary' })}
                />
              </SheetGroup>
              {errors.primaryLanguage ? (
                <FieldError id="mobile-primary-error">
                  {t(errors.primaryLanguage.message as string)}
                </FieldError>
              ) : null}
              <SheetLabel
                aside={t('languageCounterHint', {
                  count: targetLanguages.length,
                  cap: languageCap,
                })}
              >
                {t('targetLanguagesLabel')}
              </SheetLabel>
              <div className="flex flex-col gap-2.5">
                {targetLanguages.map((row, index) => (
                  <div
                    key={row.language || `new-${index}`}
                    className="flex flex-col gap-1.5 rounded-xl bg-background-darker p-1.5 pb-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setLanguagePick({ kind: 'target', index })
                        }
                        className={`flex h-11 min-w-0 flex-1 items-center rounded-lg px-2.5 text-left text-[15px] ${
                          row.language
                            ? 'font-semibold'
                            : 'font-medium text-subtle'
                        }`}
                      >
                        <span className="truncate">
                          {row.language
                            ? getLanguageName(row.language, locale)
                            : t('chooseLanguage')}
                        </span>
                      </button>
                      <SheetIconButton
                        label={t('removeLanguage')}
                        disabled={targetLanguages.length <= 1}
                        onClick={() =>
                          setTargets(
                            targetLanguages.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <MdDeleteOutline size={20} className="text-muted" />
                      </SheetIconButton>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {levels.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          aria-pressed={row.level === level.value}
                          onClick={() =>
                            setTargets(
                              targetLanguages.map((entry, i) =>
                                i === index
                                  ? { ...entry, level: level.value }
                                  : entry,
                              ),
                            )
                          }
                          className={`h-9 truncate rounded-full px-2 font-semibold text-[13px] transition-colors duration-200 ${
                            row.level === level.value
                              ? 'bg-primary-dark text-foreground'
                              : 'bg-background-dark text-muted'
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {targetError ? (
                  <FieldError id="mobile-targets-error">
                    {t(targetError)}
                  </FieldError>
                ) : null}
                {targetLanguages.length < languageCap ? (
                  <Ghost
                    icon={MdAdd}
                    label={t('addLanguage')}
                    onClick={() => {
                      setTargets([
                        ...targetLanguages,
                        createEmptyLanguageRow(),
                      ]);
                      setLanguagePick({
                        kind: 'target',
                        index: targetLanguages.length,
                      });
                    }}
                  />
                ) : premium ? null : (
                  <p className="rounded-lg bg-primary-darker px-3.5 py-3 text-[13px] text-soft leading-normal">
                    {t.rich('languageCapUpsell', {
                      freeCap: FREE_LANGUAGE_CAP,
                      premiumCap: PREMIUM_LANGUAGE_CAP,
                      premiumLink: (chunks) => (
                        <a
                          href={`/${locale}/settings#premium`}
                          className="font-bold text-primary-light"
                        >
                          {chunks}
                        </a>
                      ),
                    })}
                  </p>
                )}
              </div>
            </>
          }
          sub={
            languagePick ? (
              <SheetPickList
                key={
                  languagePick.kind === 'primary'
                    ? 'primary'
                    : `target-${languagePick.index}`
                }
                label={t('chooseLanguage')}
                options={pickOptions}
                value={
                  languagePick.kind === 'primary'
                    ? values.primaryLanguage
                    : (targetLanguages[languagePick.index]?.language ?? '')
                }
                onSelect={pickLanguage}
              />
            ) : null
          }
        />
      </Sheet>

      <Sheet
        open={sheet === 'voice'}
        onOpenChange={(open) => (open ? openSheet('voice') : closeSheet())}
        title={t('voiceIntroTitle')}
        footer={footerButton(t('done'), closeSheet)}
      >
        {voiceEditor}
      </Sheet>

      <Sheet
        open={sheet === 'availability'}
        onOpenChange={(open) =>
          open ? openSheet('availability') : closeSheet()
        }
        title={t('freeTimeLabel')}
        footer={footerButton(t('done'), closeSheet)}
      >
        {availabilityEditor}
      </Sheet>

      <Sheet
        open={sheet === 'tags'}
        onOpenChange={(open) => (open ? openSheet('tags') : closeSheet())}
        title={t('tagsLabel')}
        footer={footerButton(t('done'), closeSheet)}
      >
        {tagEditor}
      </Sheet>

      <Sheet
        open={sheet === 'location'}
        onOpenChange={(open) => (open ? openSheet('location') : closeSheet())}
        full
        flush
        title={countryPicking ? t('countryLabel') : t('locationTitle')}
        leading={
          countryPicking ? (
            <SheetIconButton
              label={t('back')}
              onClick={() => setCountryPicking(false)}
            >
              <MdArrowBack size={24} />
            </SheetIconButton>
          ) : undefined
        }
        trailing={
          countryPicking && values.country ? (
            <SheetTextButton
              onClick={() => {
                setValue('country', '', { shouldDirty: true });
                setCountryPicking(false);
              }}
            >
              {t('clearCountry')}
            </SheetTextButton>
          ) : undefined
        }
        footer={
          countryPicking ? undefined : footerButton(t('done'), closeSheet)
        }
      >
        <SheetDrill
          drilled={countryPicking}
          main={
            <>
              <SheetLabel>{t('countryLabel')}</SheetLabel>
              <SheetGroup>
                <SheetRow
                  label={countryLabel ?? t('addCountry')}
                  chevron
                  onClick={() => setCountryPicking(true)}
                />
              </SheetGroup>
              {errors.country ? (
                <FieldError id="mobile-country-error">
                  {t(errors.country.message as string)}
                </FieldError>
              ) : null}
              <SheetLabel>{t('timezoneLabel')}</SheetLabel>
              <div className="flex flex-col gap-2.5">
                <TextInput
                  id="mobile-timezone"
                  aria-label={t('timezoneLabel')}
                  error={Boolean(errors.timezone)}
                  {...register('timezone')}
                />
                {errors.timezone ? (
                  <FieldError id="mobile-timezone-error">
                    {errors.timezone.message}
                  </FieldError>
                ) : null}
                <SheetGroup>
                  <SettingsToggleRow
                    label={t('displayTimezoneLabel')}
                    description={t('displayTimezoneDescription')}
                  >
                    <Controller
                      name="displayTimezone"
                      control={control}
                      render={({ field }) => (
                        <Toggle
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label={t('displayTimezoneLabel')}
                        />
                      )}
                    />
                  </SettingsToggleRow>
                </SheetGroup>
              </div>
            </>
          }
          sub={
            countryPicking ? (
              <SheetPickList
                label={t('countryLabel')}
                options={countries}
                value={values.country ?? ''}
                onSelect={(code) => {
                  setValue('country', code, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setCountryPicking(false);
                }}
              />
            ) : null
          }
        />
      </Sheet>

      <Sheet
        open={sheet === 'privacy'}
        onOpenChange={(open) => (open ? openSheet('privacy') : closeSheet())}
        title={t('privacySettings')}
      >
        <SheetGroup>
          {(
            [
              ['isPublic', 'makeProfilePublic'],
              ['allowAnonymousCopy', 'allowAnonymousCopying'],
              ['displayTimezone', 'displayTimezone'],
              ['displayAvailability', 'displayAvailability'],
            ] as const
          ).map(([name, key]) => (
            <SettingsToggleRow
              key={name}
              label={t(`${key}Label`)}
              description={t(`${key}Description`)}
            >
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Toggle
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label={t(`${key}Label`)}
                  />
                )}
              />
            </SettingsToggleRow>
          ))}
        </SheetGroup>
      </Sheet>

      <ActionSheet
        open={sheet === 'menu'}
        onOpenChange={(open) => setSheet(open ? 'menu' : null)}
        title={t('profileOptions')}
        items={menuItems}
      />
    </form>
  );
};
