import PlatinumWindow from "@/app/SystemFolder/SystemResources/Window/PlatinumWindow";
import type {Meta, StoryObj} from '@storybook/react';
import './PlatinumWindow.scss';
import './PlatinumBaseTheme.css';

const meta = {
    title: 'Platinum/PlatinumWindow',
    component: PlatinumWindow,
    parameters: {
        layout: 'centered',
        title: "Document 1"
    },
    argTypes: {
        children: {table: {disable: true}},
        contextMenu: {table: {disable: true}},
        appMenu: {table: {disable: true}},
        hidden: {table: {disable: true}},
        appId: {table: {disable: true}},
        id: {table: {disable: true}},
    },
    tags: ['autodocs'],
} satisfies Meta<typeof PlatinumWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

//     title?: string;
//     id: string;
//     appId?: string;
//     icon?: string;
//     hidden?: boolean;
//     closable?: boolean;
//     zoomable?: boolean;
//     collapsable?: boolean;
//     resizable?: boolean;
//     scrollable?: boolean;
//     modalWindow?: boolean;
//     initialSize?: [number, number];
//     initialPosition?: [number, number];
//     appMenu?: PlatinumMenuItem[];
//     contextMenu?: PlatinumMenuItem[];
//     children?: React.ReactNode;

const childrenItems = <p>Test</p>
export const Primary: Story = {
    args: {
        id: "PlatinumWindowDemo",
        title: "Document 1",
        icon: "/img/icons/document.png",
        children: childrenItems,
        initialPosition: [0, 0],
        initialSize: [300, 200],
        resizable: false
    },
};
