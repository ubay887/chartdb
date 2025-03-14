import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Handle,
    Position,
    useConnection,
    useUpdateNodeInternals,
} from '@xyflow/react';
import { Button } from '@/components/button/button';
import { Check, KeyRound, MessageCircleMore, Trash2 } from 'lucide-react';
import type { DBField } from '@/lib/domain/db-field';
import { useChartDB } from '@/hooks/use-chartdb';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/tooltip/tooltip';
import { useClickAway, useKeyPressEvent } from 'react-use';
import { Input } from '@/components/input/input';

export const LEFT_HANDLE_ID_PREFIX = 'left_rel_';
export const RIGHT_HANDLE_ID_PREFIX = 'right_rel_';
export const TARGET_ID_PREFIX = 'target_rel_';

export interface TableNodeFieldProps {
    tableNodeId: string;
    field: DBField;
    focused: boolean;
    highlighted: boolean;
    visible: boolean;
    isConnectable: boolean;
}

export const TableNodeField: React.FC<TableNodeFieldProps> = React.memo(
    ({ field, focused, tableNodeId, highlighted, visible, isConnectable }) => {
        const { removeField, relationships, readonly, updateField } =
            useChartDB();
        const [editMode, setEditMode] = useState(false);
        const [fieldName, setFieldName] = useState(field.name);
        const inputRef = React.useRef<HTMLInputElement>(null);

        const updateNodeInternals = useUpdateNodeInternals();
        const connection = useConnection();
        const isTarget = useMemo(
            () =>
                connection.inProgress &&
                connection.fromNode.id !== tableNodeId &&
                (connection.fromHandle.id?.startsWith(RIGHT_HANDLE_ID_PREFIX) ||
                    connection.fromHandle.id?.startsWith(
                        LEFT_HANDLE_ID_PREFIX
                    )),
            [connection, tableNodeId]
        );
        const numberOfEdgesToField = useMemo(
            () =>
                relationships.filter(
                    (relationship) =>
                        relationship.targetTableId === tableNodeId &&
                        relationship.targetFieldId === field.id
                ).length,
            [relationships, tableNodeId, field.id]
        );

        const previousNumberOfEdgesToFieldRef = useRef(numberOfEdgesToField);

        useEffect(() => {
            if (
                previousNumberOfEdgesToFieldRef.current !== numberOfEdgesToField
            ) {
                updateNodeInternals(tableNodeId);
                previousNumberOfEdgesToFieldRef.current = numberOfEdgesToField;
            }
        }, [tableNodeId, updateNodeInternals, numberOfEdgesToField]);

        const editFieldName = useCallback(() => {
            if (!editMode) return;
            if (fieldName.trim()) {
                updateField(tableNodeId, field.id, { name: fieldName.trim() });
            }
            setEditMode(false);
        }, [fieldName, field.id, updateField, editMode, tableNodeId]);

        const abortEdit = useCallback(() => {
            setEditMode(false);
            setFieldName(field.name);
        }, [field.name]);

        useClickAway(inputRef, editFieldName);
        useKeyPressEvent('Enter', editFieldName);
        useKeyPressEvent('Escape', abortEdit);

        const enterEditMode = (e: React.MouseEvent) => {
            e.stopPropagation();
            setEditMode(true);
        };

        return (
            <div
                className={`group relative flex h-8 items-center justify-between gap-1 border-t px-3 text-sm last:rounded-b-[6px] hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    highlighted ? 'bg-pink-100 dark:bg-pink-900' : ''
                } transition-all duration-200 ease-in-out ${
                    visible
                        ? 'max-h-8 opacity-100'
                        : 'z-0 max-h-0 overflow-hidden opacity-0'
                }`}
            >
                {isConnectable ? (
                    <>
                        <Handle
                            id={`${RIGHT_HANDLE_ID_PREFIX}${field.id}`}
                            className={`!h-4 !w-4 !border-2 !bg-pink-600 ${!focused || readonly ? '!invisible' : ''}`}
                            position={Position.Right}
                            type="source"
                        />
                        <Handle
                            id={`${LEFT_HANDLE_ID_PREFIX}${field.id}`}
                            className={`!h-4 !w-4 !border-2 !bg-pink-600 ${!focused || readonly ? '!invisible' : ''}`}
                            position={Position.Left}
                            type="source"
                        />
                    </>
                ) : null}
                {(!connection.inProgress || isTarget) && isConnectable && (
                    <>
                        {Array.from(
                            { length: numberOfEdgesToField },
                            (_, index) => index
                        ).map((index) => (
                            <Handle
                                id={`${TARGET_ID_PREFIX}${index}_${field.id}`}
                                key={`${TARGET_ID_PREFIX}${index}_${field.id}`}
                                className={`!invisible`}
                                position={Position.Left}
                                type="target"
                            />
                        ))}
                        <Handle
                            id={`${TARGET_ID_PREFIX}${numberOfEdgesToField}_${field.id}`}
                            className={
                                isTarget
                                    ? '!absolute !left-0 !top-0 !h-full !w-full !transform-none !rounded-none !border-none !opacity-0'
                                    : `!invisible`
                            }
                            position={Position.Left}
                            type="target"
                        />
                    </>
                )}
                <div
                    className={cn(
                        'flex items-center gap-1 truncate text-left',
                        {
                            'font-semibold': field.primaryKey || field.unique,
                            'w-full': editMode,
                        }
                    )}
                >
                    {editMode ? (
                        <>
                            <Input
                                ref={inputRef}
                                onBlur={editFieldName}
                                placeholder={field.name}
                                autoFocus
                                type="text"
                                value={fieldName}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setFieldName(e.target.value)}
                                className="h-5 w-full border-[0.5px] border-blue-400 bg-slate-100 focus-visible:ring-0 dark:bg-slate-900"
                            />
                            <Button
                                variant="ghost"
                                className="size-6 p-0 text-slate-500 hover:bg-primary-foreground hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                onClick={editFieldName}
                            >
                                <Check className="size-4" />
                            </Button>
                        </>
                    ) : (
                        // <span
                        //     className="truncate"
                        //     onClick={readonly ? undefined : enterEditMode}
                        // >
                        //     {field.name}
                        // </span>
                        <span
                            className="truncate"
                            onDoubleClick={enterEditMode}
                        >
                            {field.name}
                        </span>
                    )}
                    {/* <span className="truncate">{field.name}</span> */}
                    {field.comments && !editMode ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="shrink-0 cursor-pointer text-muted-foreground">
                                    <MessageCircleMore size={14} />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>{field.comments}</TooltipContent>
                        </Tooltip>
                    ) : null}
                </div>
                {editMode ? null : (
                    <div className="flex max-w-[35%] justify-end gap-1.5 truncate hover:shrink-0">
                        {field.primaryKey ? (
                            <div
                                className={cn(
                                    'text-muted-foreground',
                                    !readonly ? 'group-hover:hidden' : ''
                                )}
                            >
                                <KeyRound size={14} />
                            </div>
                        ) : null}

                        <div
                            className={cn(
                                'content-center truncate text-right text-xs text-muted-foreground shrink-0',
                                !readonly ? 'group-hover:hidden' : ''
                            )}
                        >
                            {field.type.name.split(' ')[0]}
                            {field.nullable ? '?' : ''}
                        </div>
                        {readonly ? null : (
                            <div className="hidden flex-row group-hover:flex">
                                <Button
                                    variant="ghost"
                                    className="size-6 p-0 hover:bg-primary-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeField(tableNodeId, field.id);
                                    }}
                                >
                                    <Trash2 className="size-3.5 text-red-700" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

TableNodeField.displayName = 'TableNodeField';
