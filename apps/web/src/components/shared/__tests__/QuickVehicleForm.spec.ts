import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import QuickVehicleForm from '../QuickVehicleForm.vue'

describe('QuickVehicleForm', () => {
  const defaultProps = {
    loading: false,
    error: null as string | null
  }

  it('renders all required form fields', () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    expect(wrapper.find('#quick-spz').exists()).toBe(true)
    expect(wrapper.find('#quick-vin').exists()).toBe(true)
    expect(wrapper.find('#quick-znacka').exists()).toBe(true)
    expect(wrapper.find('#quick-model').exists()).toBe(true)
    expect(wrapper.find('#quick-majitel').exists()).toBe(true)
  })

  it('shows SPZ validation error when empty', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const spzInput = wrapper.find('#quick-spz')
    await spzInput.trigger('blur')

    expect(wrapper.text()).toContain('SPZ je povinné pole')
  })

  it('shows SPZ format error for invalid length', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const spzInput = wrapper.find('#quick-spz')
    await spzInput.setValue('AB')
    await spzInput.trigger('blur')

    expect(wrapper.text()).toContain('SPZ musí mít 5-8 znaků')
  })

  it('accepts valid SPZ format', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const spzInput = wrapper.find('#quick-spz')
    await spzInput.setValue('5L94454')
    await spzInput.trigger('blur')

    expect(wrapper.text()).not.toContain('SPZ je povinné pole')
    expect(wrapper.text()).not.toContain('SPZ musí mít')
  })

  it('shows VIN format error for invalid length', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const vinInput = wrapper.find('#quick-vin')
    await vinInput.setValue('ABC123')
    await vinInput.trigger('blur')

    expect(wrapper.text()).toContain('VIN musí mít přesně 17 znaků')
  })

  it('shows VIN error for invalid characters (I, O, Q)', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const vinInput = wrapper.find('#quick-vin')
    await vinInput.setValue('WVWZZZ3CZIA123456') // Contains I
    await vinInput.trigger('blur')

    expect(wrapper.text()).toContain('VIN obsahuje neplatné znaky')
  })

  it('accepts valid VIN format', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const vinInput = wrapper.find('#quick-vin')
    await vinInput.setValue('WVWZZZ3CZNA123456')
    await vinInput.trigger('blur')

    expect(wrapper.text()).not.toContain('VIN musí mít')
    expect(wrapper.text()).not.toContain('VIN obsahuje neplatné znaky')
  })

  it('VIN is optional - no error when empty', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const vinInput = wrapper.find('#quick-vin')
    await vinInput.trigger('blur')

    expect(wrapper.text()).not.toContain('VIN musí mít')
    expect(wrapper.text()).toContain('Volitelné')
  })

  it('shows majitel validation error when empty', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const majitelInput = wrapper.find('#quick-majitel')
    await majitelInput.trigger('blur')

    expect(wrapper.text()).toContain('Majitel je povinné pole')
  })

  it('submit button is disabled when form is invalid', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const submitButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Vytvořit příležitost')
    )

    expect(submitButton?.attributes('disabled')).toBeDefined()
  })

  it('submit button is enabled when form is valid', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    await wrapper.find('#quick-spz').setValue('5L94454')
    await wrapper.find('#quick-majitel').setValue('Jan Novak')

    const submitButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Vytvořit příležitost')
    )

    expect(submitButton?.attributes('disabled')).toBeUndefined()
  })

  it('emits submit with form data when valid', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    await wrapper.find('#quick-spz').setValue('5L94454')
    await wrapper.find('#quick-vin').setValue('WVWZZZ3CZNA123456')
    await wrapper.find('#quick-znacka').setValue('VW')
    await wrapper.find('#quick-model').setValue('Golf')
    await wrapper.find('#quick-majitel').setValue('Jan Novak')

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')?.[0]).toEqual([{
      spz: '5L94454',
      vin: 'WVWZZZ3CZNA123456',
      znacka: 'VW',
      model: 'Golf',
      majitel: 'Jan Novak'
    }])
  })

  it('emits cancel when cancel button is clicked', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    const cancelButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Zrušit')
    )
    await cancelButton?.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('shows loading state', () => {
    const wrapper = mount(QuickVehicleForm, {
      props: { ...defaultProps, loading: true }
    })

    expect(wrapper.text()).toContain('Vytvářím...')
  })

  it('shows error message', () => {
    const wrapper = mount(QuickVehicleForm, {
      props: { ...defaultProps, error: 'Test error message' }
    })

    expect(wrapper.text()).toContain('Test error message')
  })

  it('does not emit submit when form is invalid', async () => {
    const wrapper = mount(QuickVehicleForm, {
      props: defaultProps
    })

    // Try to submit with empty form
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeFalsy()
  })
})
