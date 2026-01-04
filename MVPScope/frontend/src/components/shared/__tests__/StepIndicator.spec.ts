import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StepIndicator from '../StepIndicator.vue'

describe('StepIndicator', () => {
  const defaultProps = {
    step: 1,
    label: 'Vozidlo',
    active: false,
    completed: false,
    isLast: false
  }

  it('shows checkmark when step is completed', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, completed: true }
    })

    expect(wrapper.text()).toContain('✓')
  })

  it('shows step number when not completed', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, step: 2 }
    })

    expect(wrapper.text()).toContain('2')
  })

  it('applies completed styling', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, completed: true }
    })

    const circle = wrapper.find('.rounded-full')
    expect(circle.classes()).toContain('bg-green-500')
    expect(circle.classes()).toContain('text-white')
  })

  it('applies active styling', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, active: true }
    })

    const circle = wrapper.find('.rounded-full')
    expect(circle.classes()).toContain('bg-blue-500')
    expect(circle.classes()).toContain('text-white')
  })

  it('applies inactive styling', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps }
    })

    const circle = wrapper.find('.rounded-full')
    expect(circle.classes()).toContain('bg-gray-200')
    expect(circle.classes()).toContain('text-gray-500')
  })

  it('displays step label', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, label: 'Dodavatel' }
    })

    expect(wrapper.text()).toContain('Dodavatel')
  })

  it('shows connector line when not last step', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, isLast: false }
    })

    expect(wrapper.find('.h-1').exists()).toBe(true)
  })

  it('hides connector line on last step', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, isLast: true }
    })

    expect(wrapper.find('.h-1').exists()).toBe(false)
  })

  it('shows completed line color when step is completed', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, completed: true, isLast: false }
    })

    const line = wrapper.find('.h-1')
    expect(line.classes()).toContain('bg-green-500')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, clickable: true }
    })

    await wrapper.find('div').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
