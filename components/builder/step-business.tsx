'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BusinessInfo } from '@/lib/callbot-configs';

interface StepBusinessProps {
  businessInfo: BusinessInfo;
  onChange: (info: BusinessInfo) => void;
}

interface FieldProps {
  id: keyof BusinessInfo;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'tel' | 'url';
  placeholder?: string;
}

function Field({ id, label, value, onChange, required, type = 'text', placeholder }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function StepBusiness({ businessInfo, onChange }: StepBusinessProps) {
  const update = (key: keyof BusinessInfo, value: string) =>
    onChange({ ...businessInfo, [key]: value });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Informations établissement</h2>
        <p className="text-muted-foreground mt-1">
          Ces informations seront injectées dans le bot pour des réponses personnalisées.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          id="name"
          label="Nom établissement"
          required
          value={businessInfo.name || ''}
          onChange={(v) => update('name', v)}
          placeholder="La Bella Vita"
        />
        <Field
          id="address"
          label="Adresse"
          value={businessInfo.address || ''}
          onChange={(v) => update('address', v)}
          placeholder="12 rue de la Paix, Paris"
        />
        <Field
          id="phone"
          label="Téléphone"
          type="tel"
          value={businessInfo.phone || ''}
          onChange={(v) => update('phone', v)}
          placeholder="01 23 45 67 89"
        />
        <Field
          id="hours"
          label="Horaires"
          value={businessInfo.hours || ''}
          onChange={(v) => update('hours', v)}
          placeholder="Lun-Sam 12h-22h"
        />
        <Field
          id="website"
          label="Site web"
          type="url"
          value={businessInfo.website || ''}
          onChange={(v) => update('website', v)}
          placeholder="https://..."
        />
        <Field
          id="gmb_url"
          label="Google My Business"
          type="url"
          value={businessInfo.gmb_url || ''}
          onChange={(v) => update('gmb_url', v)}
          placeholder="https://maps.app.goo.gl/..."
        />
        <Field
          id="facebook"
          label="Facebook"
          type="url"
          value={businessInfo.facebook || ''}
          onChange={(v) => update('facebook', v)}
          placeholder="https://facebook.com/..."
        />
        <Field
          id="instagram"
          label="Instagram"
          type="url"
          value={businessInfo.instagram || ''}
          onChange={(v) => update('instagram', v)}
          placeholder="https://instagram.com/..."
        />
      </div>
    </div>
  );
}
