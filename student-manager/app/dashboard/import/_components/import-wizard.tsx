'use client';

import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    FileSpreadsheet,
    Link2,
    Loader2,
    Upload,
    XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { commitImportAction } from '@/app/dashboard/import/actions';
import { LevelBadge } from '@/components/attendance/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
    ColumnMapping,
    Issue,
    ImportSummary,
    ParsedSheet,
} from '@/lib/import/types';
import type { AttendedStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ColumnInfo {
    index: number;
    label: string;
    samples: string[];
}

interface ParseResponse {
    sheet: ParsedSheet;
    columns: ColumnInfo[];
}

type Source =
    | { kind: 'file'; file: File }
    | { kind: 'url'; url: string }
    | null;

const MAPPABLE: { key: keyof Omit<ColumnMapping, 'sessions'>; label: string }[] =
    [
        { key: 'name', label: 'Student name' },
        { key: 'grade', label: 'Grade' },
        { key: 'level', label: 'Level' },
        { key: 'parentCells', label: 'Parent phone' },
        { key: 'parentEmails', label: 'Parent email' },
    ];

const STATUS_STYLES: Record<AttendedStatus, string> = {
    present: 'bg-present/12 text-present',
    late: 'bg-late/15 text-late',
    absent: 'bg-absent/12 text-absent',
    excused: 'bg-excused/12 text-excused',
};

const STATUS_LETTER: Record<AttendedStatus, string> = {
    present: 'P',
    late: 'L',
    absent: 'A',
    excused: 'E',
};

const PREVIEW_ROWS = 12;
const NONE = '__none__';

function IssueList({ issues }: { issues: Issue[] }) {
    if (issues.length === 0) return null;

    return (
        <ul className="space-y-1.5">
            {issues.map((issue, index) => (
                <li
                    key={index}
                    className={cn(
                        'flex items-start gap-2 rounded-md px-3 py-2 text-sm ring-1 ring-inset',
                        issue.level === 'error'
                            ? 'bg-destructive/10 text-destructive ring-destructive/25'
                            : 'bg-late/10 text-late ring-late/25',
                    )}
                >
                    {issue.level === 'error' ? (
                        <XCircle className="mt-0.5 size-4 shrink-0" />
                    ) : (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    )}
                    <span>
                        {issue.row !== undefined && (
                            <span className="font-medium">
                                Row {issue.row}:{' '}
                            </span>
                        )}
                        {issue.message}
                    </span>
                </li>
            ))}
        </ul>
    );
}

export function ImportWizard() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const [source, setSource] = useState<Source>(null);
    const [result, setResult] = useState<ParseResponse | null>(null);
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [url, setUrl] = useState('');
    const [dragging, setDragging] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [committing, startCommit] = useTransition();

    const runParse = useCallback(
        async (
            next: Source,
            overrides?: {
                mapping?: ColumnMapping;
                courseName?: string;
            },
        ) => {
            if (!next) return;

            setParsing(true);
            setError(null);

            try {
                let response: Response;

                if (next.kind === 'file') {
                    const form = new FormData();
                    form.append('file', next.file);
                    if (overrides?.mapping) {
                        form.append(
                            'mapping',
                            JSON.stringify(overrides.mapping),
                        );
                    }
                    if (overrides?.courseName) {
                        form.append('courseName', overrides.courseName);
                    }
                    response = await fetch('/api/import/parse', {
                        method: 'POST',
                        body: form,
                    });
                } else {
                    response = await fetch('/api/import/parse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url: next.url,
                            mapping: overrides?.mapping,
                            courseName: overrides?.courseName,
                        }),
                    });
                }

                const payload = await response.json();

                if (!response.ok) {
                    setError(payload.error ?? 'Could not read that file.');
                    setResult(null);
                    return;
                }

                setResult(payload as ParseResponse);
                setSource(next);
            } catch {
                setError('Something went wrong reading that spreadsheet.');
                setResult(null);
            } finally {
                setParsing(false);
            }
        },
        [],
    );

    const remap = (field: keyof Omit<ColumnMapping, 'sessions'>, value: string) => {
        if (!result || !source) return;
        const mapping: ColumnMapping = {
            ...result.sheet.mapping,
            [field]: value === NONE ? -1 : Number(value),
        };
        void runParse(source, {
            mapping,
            courseName: result.sheet.courseName,
        });
    };

    const reset = () => {
        setSource(null);
        setResult(null);
        setSummary(null);
        setError(null);
        setUrl('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const commit = () => {
        if (!result) return;
        startCommit(async () => {
            const response = await commitImportAction(result.sheet);
            if (!response.ok) {
                toast.error(response.error);
                return;
            }
            setSummary(response.summary);
            toast.success(`Imported ${response.summary.courseName}.`);
            router.refresh();
        });
    };

    // ---------------------------------------------------------------- done
    if (summary) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-present" />
                        <CardTitle>Import complete</CardTitle>
                    </div>
                    <CardDescription>
                        {summary.courseName} is now in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <dl className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <dt className="text-sm text-muted-foreground">
                                New students
                            </dt>
                            <dd className="text-2xl font-semibold tabular-nums">
                                {summary.studentsCreated}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">
                                Matched to existing
                            </dt>
                            <dd className="text-2xl font-semibold tabular-nums">
                                {summary.studentsMatched}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">
                                Attendance rows
                            </dt>
                            <dd className="text-2xl font-semibold tabular-nums">
                                {summary.attendanceRows}
                            </dd>
                        </div>
                    </dl>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <Link href={`/dashboard/course/${summary.courseId}`}>
                                View course
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={reset}>
                            Import another
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ------------------------------------------------------------- preview
    if (result) {
        const { sheet, columns } = result;
        const hasErrors = sheet.issues.some(
            (issue) => issue.level === 'error',
        );
        const rowIssues = sheet.students.flatMap((student) => student.issues);
        const visible = sheet.students.slice(0, PREVIEW_ROWS);
        const hidden = sheet.students.length - visible.length;

        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileSpreadsheet className="size-4" />
                        {sheet.sourceName}
                        {parsing && (
                            <Loader2 className="size-4 animate-spin" />
                        )}
                    </div>
                    <Button variant="ghost" onClick={reset}>
                        <ArrowLeft className="size-4" />
                        Choose a different file
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Check the details</CardTitle>
                        <CardDescription>
                            Columns were detected automatically. Correct
                            anything that looks wrong before importing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2 sm:max-w-md">
                            <Label htmlFor="course-name">Course name</Label>
                            <Input
                                id="course-name"
                                defaultValue={sheet.courseName}
                                onBlur={(event) => {
                                    const value = event.target.value.trim();
                                    if (value && value !== sheet.courseName) {
                                        setResult({
                                            ...result,
                                            sheet: {
                                                ...sheet,
                                                courseName: value,
                                            },
                                        });
                                    }
                                }}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {MAPPABLE.map((field) => (
                                <div key={field.key} className="grid gap-2">
                                    <Label htmlFor={`map-${field.key}`}>
                                        {field.label}
                                    </Label>
                                    <Select
                                        value={
                                            sheet.mapping[field.key] === -1
                                                ? NONE
                                                : String(sheet.mapping[field.key])
                                        }
                                        onValueChange={(value) =>
                                            remap(field.key, value)
                                        }
                                    >
                                        <SelectTrigger
                                            id={`map-${field.key}`}
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NONE}>
                                                Not in this sheet
                                            </SelectItem>
                                            {columns.map((column) => (
                                                <SelectItem
                                                    key={column.index}
                                                    value={String(column.index)}
                                                >
                                                    {column.label ||
                                                        `Column ${column.index + 1}`}
                                                    {column.samples[0] &&
                                                        ` — ${column.samples[0].slice(0, 24)}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">
                                {sheet.dates.length} session
                                {sheet.dates.length === 1 ? '' : 's'} detected
                            </p>
                            {sheet.dates.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {sheet.dates.map((date, index) => (
                                        <span
                                            key={`${date}-${index}`}
                                            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums"
                                        >
                                            {date}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {(sheet.issues.length > 0 || rowIssues.length > 0) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {hasErrors
                                    ? 'Problems to fix'
                                    : `${sheet.issues.length + rowIssues.length} thing${
                                          sheet.issues.length +
                                              rowIssues.length ===
                                          1
                                              ? ''
                                              : 's'
                                      } to review`}
                            </CardTitle>
                            <CardDescription>
                                {hasErrors
                                    ? 'These must be resolved before importing.'
                                    : 'These were handled automatically. Import will still work.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <IssueList issues={sheet.issues} />
                            {rowIssues.length > 0 && (
                                <IssueList issues={rowIssues.slice(0, 15)} />
                            )}
                            {rowIssues.length > 15 && (
                                <p className="text-sm text-muted-foreground">
                                    …and {rowIssues.length - 15} more.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {sheet.students.length} student
                            {sheet.students.length === 1 ? '' : 's'}
                        </CardTitle>
                        <CardDescription>
                            A preview of what will be imported.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="scrollbar-thin overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b">
                                        <th className="px-3 py-2 text-left font-medium">
                                            Name
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium">
                                            Grade
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium">
                                            Level
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium">
                                            Contacts
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium">
                                            Attendance
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((student) => (
                                        <tr
                                            key={student.row}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-3 py-2 font-medium whitespace-nowrap">
                                                {student.name}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground tabular-nums">
                                                {student.grade ?? '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                                <LevelBadge
                                                    level={student.level}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-xs text-muted-foreground">
                                                {student.parent_cells.length +
                                                    student.parent_emails
                                                        .length ===
                                                0
                                                    ? '—'
                                                    : [
                                                          ...student.parent_cells,
                                                          ...student.parent_emails,
                                                      ].join(', ')}
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-0.5">
                                                    {student.attended_statuses.map(
                                                        (status, index) => (
                                                            <span
                                                                key={index}
                                                                title={`${sheet.dates[index] ?? ''} ${status}`}
                                                                className={cn(
                                                                    'inline-flex size-5 items-center justify-center rounded text-[10px] font-medium',
                                                                    STATUS_STYLES[
                                                                        status
                                                                    ],
                                                                )}
                                                            >
                                                                {
                                                                    STATUS_LETTER[
                                                                        status
                                                                    ]
                                                                }
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {hidden > 0 && (
                            <p className="mt-3 text-sm text-muted-foreground">
                                …and {hidden} more row{hidden === 1 ? '' : 's'}.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        onClick={commit}
                        disabled={hasErrors || committing || parsing}
                        size="lg"
                    >
                        {committing ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Importing…
                            </>
                        ) : (
                            <>
                                <Upload className="size-4" />
                                Import {sheet.students.length} student
                                {sheet.students.length === 1 ? '' : 's'}
                            </>
                        )}
                    </Button>
                    {hasErrors && (
                        <p className="text-sm text-destructive">
                            Fix the problems above to continue.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------- source
    return (
        <Tabs defaultValue="file">
            <TabsList>
                <TabsTrigger value="file">
                    <Upload className="size-4" />
                    Upload a file
                </TabsTrigger>
                <TabsTrigger value="google">
                    <Link2 className="size-4" />
                    Google Sheets link
                </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-4">
                <div
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        const file = event.dataTransfer.files?.[0];
                        if (file) void runParse({ kind: 'file', file });
                    }}
                    className={cn(
                        'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors',
                        dragging
                            ? 'border-primary bg-accent/60'
                            : 'border-border',
                    )}
                >
                    {parsing ? (
                        <>
                            <Loader2 className="size-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Reading your spreadsheet…
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <FileSpreadsheet className="size-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium">
                                    Drop a spreadsheet here
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    .xlsx, .xlsm, .csv or .tsv, up to 10 MB
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => inputRef.current?.click()}
                            >
                                Choose a file
                            </Button>
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".xlsx,.xlsm,.csv,.tsv,.txt"
                                className="sr-only"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                        void runParse({ kind: 'file', file });
                                    }
                                }}
                            />
                        </>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="google" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Import from Google Sheets</CardTitle>
                        <CardDescription>
                            The sheet must be shared. In Google Sheets choose
                            Share, then set General access to &ldquo;Anyone with
                            the link&rdquo;.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            className="flex flex-col gap-3 sm:flex-row"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (url.trim()) {
                                    void runParse({
                                        kind: 'url',
                                        url: url.trim(),
                                    });
                                }
                            }}
                        >
                            <Input
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                className="flex-1"
                            />
                            <Button
                                type="submit"
                                disabled={parsing || !url.trim()}
                            >
                                {parsing ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Loading…
                                    </>
                                ) : (
                                    'Load sheet'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            {error && (
                <div className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/25 ring-inset">
                    <XCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                </div>
            )}
        </Tabs>
    );
}
