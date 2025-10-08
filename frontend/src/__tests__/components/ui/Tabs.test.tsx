import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { Tabs, TabList, Tab, TabPanel } from '../../../components/ui/Tabs';

describe('Tabs Component', () => {
  const TabsExample = () => (
    <Tabs defaultValue="tab1">
      <TabList>
        <Tab value="tab1">Tab 1</Tab>
        <Tab value="tab2">Tab 2</Tab>
        <Tab value="tab3">Tab 3</Tab>
      </TabList>
      <TabPanel value="tab1">Content 1</TabPanel>
      <TabPanel value="tab2">Content 2</TabPanel>
      <TabPanel value="tab3">Content 3</TabPanel>
    </Tabs>
  );

  describe('Rendering', () => {
    it('should render tabs with default value', () => {
      render(<TabsExample />);
      expect(screen.getByRole('tab', { name: /tab 1/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tab 2/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tab 3/i })).toBeInTheDocument();
    });

    it('should render active tab panel by default', () => {
      render(<TabsExample />);
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('should switch tabs on click', async () => {
      const user = userEvent.setup();
      render(<TabsExample />);

      await user.click(screen.getByRole('tab', { name: /tab 2/i }));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should update active state when switching tabs', async () => {
      const user = userEvent.setup();
      render(<TabsExample />);

      const tab1 = screen.getByRole('tab', { name: /tab 1/i });
      const tab2 = screen.getByRole('tab', { name: /tab 2/i });

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');

      await user.click(tab2);

      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Controlled Mode', () => {
    const ControlledTabs = () => {
      const [activeTab, setActiveTab] = useState('tab1');

      return (
        <div>
          <button onClick={() => setActiveTab('tab2')}>External Control</button>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab value="tab1">Tab 1</Tab>
              <Tab value="tab2">Tab 2</Tab>
            </TabList>
            <TabPanel value="tab1">Content 1</TabPanel>
            <TabPanel value="tab2">Content 2</TabPanel>
          </Tabs>
        </div>
      );
    };

    it('should work in controlled mode', async () => {
      const user = userEvent.setup();
      render(<ControlledTabs />);

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      await user.click(screen.getByText('External Control'));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should call onChange when tab is clicked in controlled mode', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <Tabs value="tab1" onChange={handleChange}>
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
          </TabList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      await user.click(screen.getByRole('tab', { name: /tab 2/i }));
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('Disabled Tabs', () => {
    it('should render disabled tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2" disabled>Tab 2</Tab>
          </TabList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const disabledTab = screen.getByRole('tab', { name: /tab 2/i });
      expect(disabledTab).toBeDisabled();
    });

    it('should not switch to disabled tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2" disabled>Tab 2</Tab>
          </TabList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      await user.click(screen.getByRole('tab', { name: /tab 2/i }));
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });

    it('should apply disabled styles', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabList>
            <Tab value="tab1" disabled>Disabled Tab</Tab>
          </TabList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      const tab = screen.getByRole('tab');
      expect(tab.className).toContain('opacity-50');
      expect(tab.className).toContain('cursor-not-allowed');
    });
  });

  describe('TabList Variants', () => {
    it('should apply default variant styles', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabList variant="default">
            <Tab value="tab1">Tab 1</Tab>
          </TabList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      const tabList = container.querySelector('.bg-white.p-2.rounded-lg.shadow-sm');
      expect(tabList).toBeInTheDocument();
    });

    it('should apply pills variant styles', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabList variant="pills">
            <Tab value="tab1">Tab 1</Tab>
          </TabList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      const tabList = container.querySelector('.bg-gray-100.p-1.rounded-lg');
      expect(tabList).toBeInTheDocument();
    });

    it('should apply underline variant styles', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabList variant="underline">
            <Tab value="tab1">Tab 1</Tab>
          </TabList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      const tabList = container.querySelector('.border-b.border-gray-200');
      expect(tabList).toBeInTheDocument();
    });
  });

  describe('Tab Styling', () => {
    it('should apply active styles to selected tab', () => {
      render(<TabsExample />);
      const activeTab = screen.getByRole('tab', { name: /tab 1/i });
      expect(activeTab.className).toContain('bg-blue-500');
      expect(activeTab.className).toContain('text-white');
    });

    it('should apply inactive styles to unselected tab', () => {
      render(<TabsExample />);
      const inactiveTab = screen.getByRole('tab', { name: /tab 2/i });
      expect(inactiveTab.className).toContain('bg-gray-100');
      expect(inactiveTab.className).toContain('text-gray-700');
    });

    it('should have hover styles on inactive tabs', () => {
      render(<TabsExample />);
      const inactiveTab = screen.getByRole('tab', { name: /tab 2/i });
      expect(inactiveTab.className).toContain('hover:bg-gray-200');
    });
  });

  describe('TabPanel', () => {
    it('should show active panel and hide others', () => {
      render(<TabsExample />);

      // Content 1 should be visible
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Content 2 and 3 should not be mounted (component returns null for inactive panels)
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('should have role="tabpanel"', () => {
      render(<TabsExample />);
      const panels = screen.getAllByRole('tabpanel', { hidden: true });
      expect(panels.length).toBeGreaterThan(0);
    });

    it('should keep mounted when keepMounted is true', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
          </TabList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2" keepMounted>Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should unmount inactive panels by default', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
          </TabList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className to Tabs', () => {
      const { container } = render(
        <Tabs defaultValue="tab1" className="custom-tabs">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
          </TabList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      expect(container.querySelector('.custom-tabs')).toBeInTheDocument();
    });

    it('should apply custom className to TabList', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabList className="custom-tablist">
            <Tab value="tab1">Tab 1</Tab>
          </TabList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      expect(container.querySelector('.custom-tablist')).toBeInTheDocument();
    });

    it('should apply custom className to Tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabList>
            <Tab value="tab1" className="custom-tab">Tab 1</Tab>
          </TabList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      const tab = screen.getByRole('tab');
      expect(tab.className).toContain('custom-tab');
    });

    it('should apply custom className to TabPanel', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabList>
            <Tab value="tab1">Tab 1</Tab>
          </TabList>
          <TabPanel value="tab1" className="custom-panel">Content</TabPanel>
        </Tabs>
      );

      expect(container.querySelector('.custom-panel')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TabsExample />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<TabsExample />);

      const tab1 = screen.getByRole('tab', { name: /tab 1/i });
      tab1.focus();

      await user.keyboard('{Enter}');
      expect(tab1).toHaveAttribute('aria-selected', 'true');
    });

    it('should have focus styles', () => {
      render(<TabsExample />);
      const tab = screen.getByRole('tab', { name: /tab 1/i });
      expect(tab.className).toContain('focus:outline-none');
      expect(tab.className).toContain('focus:ring-2');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when Tab is used outside Tabs context', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Tab value="test">Test</Tab>);
      }).toThrow('Tab components must be used within a Tabs component');

      consoleSpy.mockRestore();
    });

    it('should throw error when TabPanel is used outside Tabs context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TabPanel value="test">Content</TabPanel>);
      }).toThrow('Tab components must be used within a Tabs component');

      consoleSpy.mockRestore();
    });
  });
});
