/**
 * C/AL Action Completion Data
 * Static completion items for ACTIONS sections:
 * - Action type names (ActionContainer, ActionGroup, Action, Separator)
 * - Action property names (CaptionML, Image, Promoted, etc.)
 * - Property value suggestions (Yes/No for booleans, enum values)
 */

import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';

/**
 * Action type completion items
 * These appear in the type column of action declarations
 */
export const ACTION_TYPES: CompletionItem[] = [
  {
    label: 'ActionContainer',
    kind: CompletionItemKind.EnumMember,
    detail: 'Action Type',
    documentation: 'Container for organizing actions into groups (ActionItems, Reports, etc.)'
  },
  {
    label: 'ActionGroup',
    kind: CompletionItemKind.EnumMember,
    detail: 'Action Type',
    documentation: 'Group of related actions that appears as a submenu'
  },
  {
    label: 'Action',
    kind: CompletionItemKind.EnumMember,
    detail: 'Action Type',
    documentation: 'Individual action that triggers code or opens a page/report'
  },
  {
    label: 'Separator',
    kind: CompletionItemKind.EnumMember,
    detail: 'Action Type',
    documentation: 'Visual separator between actions'
  }
];

/**
 * Action property name completion items
 * Common properties used in action definitions
 */
export const ACTION_PROPERTIES: CompletionItem[] = [
  {
    label: 'Name',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Internal name of the action'
  },
  {
    label: 'CaptionML',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Multi-language caption text displayed to users'
  },
  {
    label: 'ToolTipML',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Multi-language tooltip text shown on hover'
  },
  {
    label: 'Description',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Internal description for documentation purposes'
  },
  {
    label: 'Image',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Icon displayed with the action'
  },
  {
    label: 'Promoted',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Whether the action appears in the ribbon (Yes/No)'
  },
  {
    label: 'PromotedCategory',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Ribbon category where promoted action appears'
  },
  {
    label: 'PromotedIsBig',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Whether promoted action displays as large button (Yes/No)'
  },
  {
    label: 'PromotedOnly',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Whether action only appears in ribbon, not in menu (Yes/No)'
  },
  {
    label: 'ShortCutKey',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Keyboard shortcut for the action'
  },
  {
    label: 'RunObject',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Object to run when action is triggered (e.g., Page 21)'
  },
  {
    label: 'RunPageMode',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Mode for opening the page (View, Edit, Create)'
  },
  {
    label: 'RunPageView',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Table view (filter/sort) to apply when opening page'
  },
  {
    label: 'RunPageLink',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Field mappings to filter the opened page'
  },
  {
    label: 'ApplicationArea',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Application areas where action is available'
  },
  {
    label: 'Visible',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Whether the action is visible (Yes/No or dynamic expression)'
  },
  {
    label: 'Enabled',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Whether the action is enabled (Yes/No or dynamic expression)'
  },
  {
    label: 'ActionContainerType',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Type of action container (ActionItems, RelatedInformation, Reports, etc.)'
  },
  {
    label: 'Scope',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Scope of the action (Page or Repeater)'
  },
  {
    label: 'InFooterBar',
    kind: CompletionItemKind.Property,
    detail: 'Action Property',
    documentation: 'Whether action appears in footer bar (Yes/No)'
  }
];

/**
 * Shared boolean (Yes/No) completion values
 */
const BOOLEAN_VALUES: CompletionItem[] = [
  { label: 'Yes', kind: CompletionItemKind.Value, detail: 'Boolean' },
  { label: 'No', kind: CompletionItemKind.Value, detail: 'Boolean' }
];

/**
 * Property value completion items
 * Context-dependent values based on property name
 */
export const ACTION_PROPERTY_VALUES = new Map<string, CompletionItem[]>([
  // ActionContainerType values
  ['actioncontainertype', [
    {
      label: 'ActionItems',
      kind: CompletionItemKind.Value,
      detail: 'ActionContainerType',
      documentation: 'Container for action menu items'
    },
    {
      label: 'RelatedInformation',
      kind: CompletionItemKind.Value,
      detail: 'ActionContainerType',
      documentation: 'Container for related information actions'
    },
    {
      label: 'Reports',
      kind: CompletionItemKind.Value,
      detail: 'ActionContainerType',
      documentation: 'Container for report actions'
    },
    {
      label: 'NewDocumentItems',
      kind: CompletionItemKind.Value,
      detail: 'ActionContainerType',
      documentation: 'Container for new document creation actions'
    },
    {
      label: 'HomeItems',
      kind: CompletionItemKind.Value,
      detail: 'ActionContainerType',
      documentation: 'Container for home page actions'
    },
    {
      label: 'ActivityButtons',
      kind: CompletionItemKind.Value,
      detail: 'ActionContainerType',
      documentation: 'Container for activity buttons'
    }
  ]],

  // PromotedCategory values
  ['promotedcategory', [
    {
      label: 'New',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'New category in the ribbon'
    },
    {
      label: 'Process',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Process category in the ribbon'
    },
    {
      label: 'Report',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Report category in the ribbon'
    },
    {
      label: 'Category4',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Custom category 4 in the ribbon'
    },
    {
      label: 'Category5',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Custom category 5 in the ribbon'
    },
    {
      label: 'Category6',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Custom category 6 in the ribbon'
    },
    {
      label: 'Category7',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Custom category 7 in the ribbon'
    },
    {
      label: 'Category8',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Custom category 8 in the ribbon'
    },
    {
      label: 'Category9',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Custom category 9 in the ribbon'
    },
    {
      label: 'Category10',
      kind: CompletionItemKind.Value,
      detail: 'PromotedCategory',
      documentation: 'Custom category 10 in the ribbon'
    }
  ]],

  // Boolean properties (Yes/No)
  ['promoted', BOOLEAN_VALUES],
  ['promotedisbig', BOOLEAN_VALUES],
  ['promotedonly', BOOLEAN_VALUES],
  ['visible', BOOLEAN_VALUES],
  ['enabled', BOOLEAN_VALUES],
  ['infooterbar', BOOLEAN_VALUES],

  // RunPageMode values
  ['runpagemode', [
    {
      label: 'View',
      kind: CompletionItemKind.Value,
      detail: 'RunPageMode',
      documentation: 'Open page in view-only mode'
    },
    {
      label: 'Edit',
      kind: CompletionItemKind.Value,
      detail: 'RunPageMode',
      documentation: 'Open page in edit mode'
    },
    {
      label: 'Create',
      kind: CompletionItemKind.Value,
      detail: 'RunPageMode',
      documentation: 'Open page to create a new record'
    }
  ]],

  // Scope values
  ['scope', [
    {
      label: 'Page',
      kind: CompletionItemKind.Value,
      detail: 'Scope',
      documentation: 'Action applies at page level'
    },
    {
      label: 'Repeater',
      kind: CompletionItemKind.Value,
      detail: 'Scope',
      documentation: 'Action applies at repeater/row level'
    }
  ]]
]);
