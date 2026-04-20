'use client';

import { createContext, useContext } from 'react';

export type FacilityViewContextValue = {
    facilityId: string;
    facilityName: string | null;
};

const FacilityViewContext = createContext<FacilityViewContextValue | null>(null);

export function FacilityViewProvider({
    value,
    children,
}: {
    value: FacilityViewContextValue;
    children: React.ReactNode;
}) {
    return (
        <FacilityViewContext.Provider value={value}>
            {children}
        </FacilityViewContext.Provider>
    );
}

export function useFacilityView() {
    return useContext(FacilityViewContext);
}

