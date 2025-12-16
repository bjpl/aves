import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanel } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

// Basic Tabs
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1">
      <TabList>
        <Tab value="tab1">Overview</Tab>
        <Tab value="tab2">Details</Tab>
        <Tab value="tab3">Settings</Tab>
      </TabList>
      <TabPanel value="tab1" className="p-4">
        <p className="text-gray-600">This is the overview content.</p>
      </TabPanel>
      <TabPanel value="tab2" className="p-4">
        <p className="text-gray-600">This is the details content.</p>
      </TabPanel>
      <TabPanel value="tab3" className="p-4">
        <p className="text-gray-600">This is the settings content.</p>
      </TabPanel>
    </Tabs>
  ),
};

// Tab List Variants
export const PillsVariant: Story = {
  render: () => (
    <Tabs defaultValue="birds">
      <TabList variant="pills">
        <Tab value="birds">Birds</Tab>
        <Tab value="mammals">Mammals</Tab>
        <Tab value="reptiles">Reptiles</Tab>
      </TabList>
      <TabPanel value="birds" className="p-4">
        <p className="text-gray-600">Content about birds.</p>
      </TabPanel>
      <TabPanel value="mammals" className="p-4">
        <p className="text-gray-600">Content about mammals.</p>
      </TabPanel>
      <TabPanel value="reptiles" className="p-4">
        <p className="text-gray-600">Content about reptiles.</p>
      </TabPanel>
    </Tabs>
  ),
};

export const UnderlineVariant: Story = {
  render: () => (
    <Tabs defaultValue="description">
      <TabList variant="underline">
        <Tab value="description">Description</Tab>
        <Tab value="habitat">Habitat</Tab>
        <Tab value="behavior">Behavior</Tab>
      </TabList>
      <TabPanel value="description" className="p-4">
        <p className="text-gray-600">Species description content.</p>
      </TabPanel>
      <TabPanel value="habitat" className="p-4">
        <p className="text-gray-600">Habitat information content.</p>
      </TabPanel>
      <TabPanel value="behavior" className="p-4">
        <p className="text-gray-600">Behavior patterns content.</p>
      </TabPanel>
    </Tabs>
  ),
};

// With Disabled Tab
export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="available">
      <TabList>
        <Tab value="available">Available</Tab>
        <Tab value="premium" disabled>Premium (Coming Soon)</Tab>
        <Tab value="settings">Settings</Tab>
      </TabList>
      <TabPanel value="available" className="p-4">
        <p className="text-gray-600">Free content available to all users.</p>
      </TabPanel>
      <TabPanel value="premium" className="p-4">
        <p className="text-gray-600">Premium content for subscribers.</p>
      </TabPanel>
      <TabPanel value="settings" className="p-4">
        <p className="text-gray-600">User settings panel.</p>
      </TabPanel>
    </Tabs>
  ),
};

// Controlled Tabs
export const Controlled: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('tab1');

    return (
      <div>
        <div className="mb-4 text-sm text-gray-500">
          Current tab: <strong>{activeTab}</strong>
        </div>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab value="tab1">First</Tab>
            <Tab value="tab2">Second</Tab>
            <Tab value="tab3">Third</Tab>
          </TabList>
          <TabPanel value="tab1" className="p-4">
            <p>First tab content</p>
          </TabPanel>
          <TabPanel value="tab2" className="p-4">
            <p>Second tab content</p>
          </TabPanel>
          <TabPanel value="tab3" className="p-4">
            <p>Third tab content</p>
          </TabPanel>
        </Tabs>
      </div>
    );
  },
};

// Species Detail Tabs
export const SpeciesDetailTabs: Story = {
  render: () => (
    <Tabs defaultValue="info" className="max-w-2xl">
      <TabList variant="underline">
        <Tab value="info">Information</Tab>
        <Tab value="gallery">Gallery</Tab>
        <Tab value="sounds">Sounds</Tab>
        <Tab value="similar">Similar Species</Tab>
      </TabList>
      <TabPanel value="info" className="p-4">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900">Scientific Name</h4>
            <p className="text-gray-600 italic">Cardinalis cardinalis</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Family</h4>
            <p className="text-gray-600">Cardinalidae</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Conservation Status</h4>
            <span className="inline-block bg-green-100 text-green-800 text-sm px-2 py-1 rounded">
              Least Concern
            </span>
          </div>
        </div>
      </TabPanel>
      <TabPanel value="gallery" className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
          ))}
        </div>
      </TabPanel>
      <TabPanel value="sounds" className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <button className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full">
              ▶
            </button>
            <div>
              <p className="font-medium">Song</p>
              <p className="text-sm text-gray-500">0:15</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <button className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full">
              ▶
            </button>
            <div>
              <p className="font-medium">Call</p>
              <p className="text-sm text-gray-500">0:08</p>
            </div>
          </div>
        </div>
      </TabPanel>
      <TabPanel value="similar" className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="w-12 h-12 bg-red-100 rounded-lg" />
            <div>
              <p className="font-medium">Pyrrhuloxia</p>
              <p className="text-sm text-gray-500">Similar crest and shape</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <div className="w-12 h-12 bg-red-100 rounded-lg" />
            <div>
              <p className="font-medium">Summer Tanager</p>
              <p className="text-sm text-gray-500">Similar red coloration</p>
            </div>
          </div>
        </div>
      </TabPanel>
    </Tabs>
  ),
};

// Learning Mode Tabs
export const LearningModeTabs: Story = {
  render: () => (
    <Tabs defaultValue="vocabulary" className="max-w-lg">
      <TabList variant="pills" className="justify-center">
        <Tab value="vocabulary">📚 Vocabulary</Tab>
        <Tab value="identification">🔍 Identification</Tab>
        <Tab value="quiz">❓ Quiz</Tab>
      </TabList>
      <TabPanel value="vocabulary" className="p-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">el pico</h3>
          <p className="text-lg text-gray-600">the beak</p>
          <p className="text-sm text-gray-400 mt-4">/el PEE-koh/</p>
        </div>
      </TabPanel>
      <TabPanel value="identification" className="p-6">
        <div className="text-center">
          <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg mb-4" />
          <p className="text-gray-600">Click on the beak (el pico)</p>
        </div>
      </TabPanel>
      <TabPanel value="quiz" className="p-6">
        <div className="text-center">
          <p className="text-lg mb-4">What is "the beak" in Spanish?</p>
          <div className="space-y-2">
            <button className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg">
              el ala
            </button>
            <button className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg">
              el pico
            </button>
            <button className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg">
              la cola
            </button>
          </div>
        </div>
      </TabPanel>
    </Tabs>
  ),
};
